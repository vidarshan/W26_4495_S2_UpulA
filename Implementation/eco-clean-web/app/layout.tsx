import type { Viewport } from "next";
import Providers from "./providers/providers";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/notifications/styles.css";
import { Comic_Neue } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";
import {
  ColorSchemeScript,
  MantineProvider,
  createTheme,
  mantineHtmlProps,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import PWARegister from "./_pwa_register";

export const metadata = {
  title: "Eco Clean",
  applicationName: "Eco Clean",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Eco Clean",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#84cc16",
};

const comicNeue = Comic_Neue({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-comic-neue",
});

const theme = createTheme({
  defaultRadius: "lg",
  primaryColor: "lime",
  fontFamily: "Comic Neue, sans-serif",
  headings: {
    fontFamily: "Comic Neue, sans-serif",
  },
  components: {
    Button: {
      defaultProps: {
        radius: "lg",
        size: "md",
        color: "lime",
      },
    },
    Badge: {
      defaultProps: {
        radius: "lg",
        size: "md",
      },
    },
    Paper: {
      defaultProps: {
        radius: "lg",
      },
    },
    ThemeIcon: {
      defaultProps: {
        radius: "lg",
      },
    },
    Card: {
      defaultProps: {
        radius: "lg",
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: "lg",
        size: "md",
      },
    },
    TextInput: {
      defaultProps: {
        radius: "lg",
        size: "md",
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: "lg",
        size: "md",
      },
    },
    Select: {
      defaultProps: {
        radius: "lg",
        size: "md",
      },
    },
    NumberInput: {
      defaultProps: {
        radius: "lg",
        size: "md",
      },
    },
    SegmentedControl: {
      defaultProps: {
        radius: "lg",
        size: "md",
      },
    },
    DatePickerInput: {
      defaultProps: {
        radius: "lg",
        size: "md",
      },
    },
    TimeInput: {
      defaultProps: {
        radius: "lg",
        size: "md",
      },
    },
  },
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
      <body className={`${comicNeue.variable} antialiased`}>
        <MantineProvider theme={theme}>
          <Notifications position="top-right" />
          <QueryProvider>
            <PWARegister />
            <Providers>{children}</Providers>
          </QueryProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
