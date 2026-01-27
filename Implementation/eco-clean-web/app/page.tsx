import { Container, MantineProvider } from "@mantine/core";

export default function Home() {
  return (
    <MantineProvider defaultColorScheme="light">
      <Container style={{ backgroundColor: "red" }} size="xl">
        <div>Get Starteds</div>
      </Container>
    </MantineProvider>
  );
}
