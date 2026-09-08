from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Group(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)

    members = db.relationship(
        "Member",
        backref="group",
        cascade="all, delete-orphan",
        lazy=True,
    )
    expenses = db.relationship(
        "Expense",
        backref="group",
        cascade="all, delete-orphan",
        lazy=True,
    )


class Member(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey("group.id"), nullable=False)


class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(160), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    paid_by = db.Column(db.Integer, db.ForeignKey("member.id"), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey("group.id"), nullable=False)

    payer = db.relationship("Member", foreign_keys=[paid_by])
    splits = db.relationship(
        "ExpenseSplit",
        backref="expense",
        cascade="all, delete-orphan",
        lazy=True,
    )


class ExpenseSplit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey("expense.id"), nullable=False)
    member_id = db.Column(db.Integer, db.ForeignKey("member.id"), nullable=False)
    share = db.Column(db.Float, nullable=False)

    member = db.relationship("Member")


class Settlement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey("group.id"), nullable=False)
    from_member = db.Column(db.Integer, db.ForeignKey("member.id"), nullable=False)
    to_member = db.Column(db.Integer, db.ForeignKey("member.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
