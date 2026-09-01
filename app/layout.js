import './globals.css';

export const metadata = {
  title: 'Budget Tracker',
  description: 'Personal budget tracker with AI-assisted entry',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
