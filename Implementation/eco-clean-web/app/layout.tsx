import type { Metadata } from "next";
import Providers from "./providers/providers";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/notifications/styles.css";
import { Manrope } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";

export const metadata: Metadata = {
  title: "Eco Clean | Admin",
};

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
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
      <body className={`${manrope.variable} antialiased`}>
        <MantineProvider theme={{ defaultRadius: "md", primaryColor: "green" }}>
          <Notifications position="top-right" />
          <QueryProvider>
            <Providers>{children}</Providers>
          </QueryProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
