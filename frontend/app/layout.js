import "./globals.css";

export const metadata = {
  title: "FairShare",
  description: "Shared expenses without the awkward math",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
