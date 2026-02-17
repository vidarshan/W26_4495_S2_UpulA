import type { Metadata } from "next";
import Providers from "./providers/providers";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/dropzone/styles.css";
import { Google_Sans } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";

export const metadata: Metadata = {
  title: "Eco Clean | Admin",
};

const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
});
const googleSansMono = Google_Sans({
  variable: "--font-google-sans-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body
        className={`${googleSans.variable} ${googleSansMono.variable} antialiased`}
      >
        <MantineProvider theme={{ defaultRadius: "md", primaryColor: "green" }}>
          <QueryProvider>
            <Providers>{children}</Providers>
          </QueryProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
