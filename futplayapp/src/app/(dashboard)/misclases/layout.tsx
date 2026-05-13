import { Plus_Jakarta_Sans, Inter } from "next/font/google";

const headline = Plus_Jakarta_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
    variable: "--font-futplay-headline",
});

const body = Inter({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    variable: "--font-futplay-body",
});

export default function MisclasesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div
            className={`${headline.variable} ${body.variable} min-h-full font-[family-name:var(--font-futplay-body),sans-serif] antialiased text-[#191c1e] bg-[#f8f9fb]`}
        >
            {children}
        </div>
    );
}
