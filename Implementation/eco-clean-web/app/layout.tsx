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

const SHARED_RADIUS = "lg";

const theme = createTheme({
  defaultRadius: SHARED_RADIUS,
  primaryColor: "lime",
  fontFamily: "Comic Neue, sans-serif",
  headings: {
    fontFamily: "Comic Neue, sans-serif",
  },
  components: {
    Button: {
      defaultProps: {
        radius: SHARED_RADIUS,
        size: "md",
        color: "lime",
      },
    },
    Badge: {
      defaultProps: {
        radius: SHARED_RADIUS,
        size: "md",
      },
    },
    Paper: {
      defaultProps: {
        radius: SHARED_RADIUS,
      },
    },
    ThemeIcon: {
      defaultProps: {
        radius: SHARED_RADIUS,
      },
    },
    Card: {
      defaultProps: {
        radius: SHARED_RADIUS,
      },
    },
    Modal: {
      defaultProps: {
        radius: SHARED_RADIUS,
      },
    },
    Drawer: {
      defaultProps: {
        radius: SHARED_RADIUS,
      },
    },
    Menu: {
      defaultProps: {
        radius: SHARED_RADIUS,
      },
    },
    Popover: {
      defaultProps: {
        radius: SHARED_RADIUS,
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: SHARED_RADIUS,
        size: "md",
      },
    },
    TextInput: {
      defaultProps: {
        radius: SHARED_RADIUS,
        size: "sm",
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: SHARED_RADIUS,
        size: "sm",
      },
    },
    Textarea: {
      defaultProps: {
        radius: SHARED_RADIUS,
        size: "sm",
      },
    },
    Select: {
      defaultProps: {
        radius: SHARED_RADIUS,
        size: "sm",
      },
    },
    MultiSelect: {
      defaultProps: {
        radius: SHARED_RADIUS,
        size: "sm",
      },
    },
    NumberInput: {
      defaultProps: {
        radius: SHARED_RADIUS,
        size: "sm",
      },
    },
    SegmentedControl: {
      defaultProps: {
        radius: SHARED_RADIUS,
        size: "sm",
      },
    },
    DatePickerInput: {
      defaultProps: {
        radius: SHARED_RADIUS,
        size: "sm",
      },
    },
    DateInput: {
      defaultProps: {
        radius: SHARED_RADIUS,
        size: "sm",
      },
    },
    TimeInput: {
      defaultProps: {
        radius: SHARED_RADIUS,
        size: "sm",
      },
    },
    Checkbox: {
      defaultProps: {
        size: "sm",
      },
    },
    Radio: {
      defaultProps: {
        size: "sm",
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
