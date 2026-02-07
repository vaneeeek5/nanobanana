import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Google Cloud Vertex AI Demo',
    description: 'Integration of Nano Banana Pro and Veo 3.1',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
