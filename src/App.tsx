import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GameProvider } from "@/lib/gameContext";
import { GameFlow } from "@/pages/GameFlow";
import { Phone } from "@/pages/Phone";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/phone" component={Phone} />
      <Route component={GameFlow} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GameProvider>
        <Router />
      </GameProvider>
    </QueryClientProvider>
  );
}

export default App;
