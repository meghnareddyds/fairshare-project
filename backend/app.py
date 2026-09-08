from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

from models import db, Group, Member, Expense, ExpenseSplit, Settlement

BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{BASE_DIR / 'fairshare.db'}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
CORS(app)


def round_money(value):
    return round(float(value) + 1e-9, 2)


def group_balances(group):
    balances = {member.id: 0.0 for member in group.members}

    for expense in group.expenses:
        balances[expense.paid_by] += expense.amount
        for split in expense.splits:
            balances[split.member_id] -= split.share

    settlements = Settlement.query.filter_by(group_id=group.id).all()
    for settlement in settlements:
        balances[settlement.from_member] += settlement.amount
        balances[settlement.to_member] -= settlement.amount

    return {
        member.id: round_money(balances[member.id])
        for member in group.members
    }


def serialize_group(group):
    balances = group_balances(group)

    return {
        "id": group.id,
        "name": group.name,
        "members": [
            {
                "id": member.id,
                "name": member.name,
                "balance": balances[member.id],
            }
            for member in group.members
        ],
        "expenses": [
            {
                "id": expense.id,
                "description": expense.description,
                "amount": round_money(expense.amount),
                "paid_by": expense.paid_by,
                "paid_by_name": expense.payer.name,
                "split_between": [split.member_id for split in expense.splits],
            }
            for expense in reversed(group.expenses)
        ],
    }


@app.get("/api/groups")
def list_groups():
    groups = Group.query.order_by(Group.id.desc()).all()
    return jsonify([
        {"id": group.id, "name": group.name, "member_count": len(group.members)}
        for group in groups
    ])


@app.post("/api/groups")
def create_group():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    members = [str(name).strip() for name in data.get("members", []) if str(name).strip()]

    if not name or len(members) < 2:
        return jsonify({"error": "A group needs a name and at least two members."}), 400

    group = Group(name=name)
    db.session.add(group)
    db.session.flush()

    for member_name in members:
        db.session.add(Member(name=member_name, group_id=group.id))

    db.session.commit()
    return jsonify(serialize_group(group)), 201


@app.get("/api/groups/<int:group_id>")
def get_group(group_id):
    group = db.get_or_404(Group, group_id)
    return jsonify(serialize_group(group))


@app.post("/api/groups/<int:group_id>/members")
def add_member(group_id):
    group = db.get_or_404(Group, group_id)
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({"error": "Member name is required."}), 400

    member = Member(name=name, group_id=group.id)
    db.session.add(member)
    db.session.commit()

    return jsonify(serialize_group(group)), 201


@app.post("/api/groups/<int:group_id>/expenses")
def add_expense(group_id):
    group = db.get_or_404(Group, group_id)
    data = request.get_json() or {}

    description = (data.get("description") or "").strip()
    paid_by = data.get("paid_by")
    split_between = data.get("split_between") or []

    try:
        amount = round_money(data.get("amount"))
    except (TypeError, ValueError):
        amount = 0

    member_ids = {member.id for member in group.members}
    split_ids = [member_id for member_id in split_between if member_id in member_ids]

    if (
        not description
        or amount <= 0
        or paid_by not in member_ids
        or not split_ids
    ):
        return jsonify({"error": "Expense details are incomplete."}), 400

    expense = Expense(
        description=description,
        amount=amount,
        paid_by=paid_by,
        group_id=group.id,
    )
    db.session.add(expense)
    db.session.flush()

    base_share = round_money(amount / len(split_ids))
    running_total = 0.0

    for index, member_id in enumerate(split_ids):
        if index == len(split_ids) - 1:
            share = round_money(amount - running_total)
        else:
            share = base_share
            running_total += share

        db.session.add(
            ExpenseSplit(
                expense_id=expense.id,
                member_id=member_id,
                share=share,
            )
        )

    db.session.commit()
    return jsonify(serialize_group(group)), 201


@app.post("/api/groups/<int:group_id>/settlements")
def settle_balance(group_id):
    group = db.get_or_404(Group, group_id)
    data = request.get_json() or {}

    from_member = data.get("from_member")
    to_member = data.get("to_member")

    try:
        amount = round_money(data.get("amount"))
    except (TypeError, ValueError):
        amount = 0

    member_ids = {member.id for member in group.members}

    if (
        from_member not in member_ids
        or to_member not in member_ids
        or from_member == to_member
        or amount <= 0
    ):
        return jsonify({"error": "Settlement details are invalid."}), 400

    db.session.add(
        Settlement(
            group_id=group.id,
            from_member=from_member,
            to_member=to_member,
            amount=amount,
        )
    )
    db.session.commit()

    return jsonify(serialize_group(group)), 201


def seed_data():
    if Group.query.count() > 0:
        return

    group = Group(name="Weekend Trip")
    db.session.add(group)
    db.session.flush()

    names = ["Maya", "Alex", "Jordan"]
    members = []

    for name in names:
        member = Member(name=name, group_id=group.id)
        db.session.add(member)
        members.append(member)

    db.session.flush()

    samples = [
        ("Hotel", 360, members[0].id, [member.id for member in members]),
        ("Dinner", 96, members[1].id, [member.id for member in members]),
        ("Parking", 30, members[2].id, [members[0].id, members[2].id]),
    ]

    for description, amount, paid_by, split_ids in samples:
        expense = Expense(
            description=description,
            amount=amount,
            paid_by=paid_by,
            group_id=group.id,
        )
        db.session.add(expense)
        db.session.flush()

        share = round_money(amount / len(split_ids))
        running_total = 0.0

        for index, member_id in enumerate(split_ids):
            current_share = (
                round_money(amount - running_total)
                if index == len(split_ids) - 1
                else share
            )
            if index != len(split_ids) - 1:
                running_total += current_share

            db.session.add(
                ExpenseSplit(
                    expense_id=expense.id,
                    member_id=member_id,
                    share=current_share,
                )
            )

    db.session.commit()


with app.app_context():
    db.create_all()
    seed_data()


if __name__ == "__main__":
    app.run(debug=True, port=5000)
