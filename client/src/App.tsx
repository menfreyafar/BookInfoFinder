import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/sidebar";
import Dashboard from "@/pages/dashboard";
import ISBNSearch from "@/pages/isbn-search";
import Catalog from "@/pages/catalog";
import Inventory from "@/pages/inventory";
import POS from "@/pages/pos";
import Export from "@/pages/export";
import Orders from "@/pages/orders";
import Exchanges from "@/pages/exchanges";
import PreCatalog from "@/pages/pre-catalog";
import MissingBooks from "@/pages/missing-books";
import Storage from "@/pages/storage";
import Settings from "@/pages/settings";
import CustomerRequestsPage from "@/pages/CustomerRequestsPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/isbn-search" component={ISBNSearch} />
          <Route path="/catalog" component={Catalog} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/pos" component={POS} />
          <Route path="/orders" component={Orders} />
          <Route path="/exchanges" component={Exchanges} />
          <Route path="/pre-catalog" component={PreCatalog} />
          <Route path="/missing-books" component={MissingBooks} />
          <Route path="/radar" component={CustomerRequestsPage} />
          <Route path="/storage" component={Storage} />
          <Route path="/export" component={Export} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
