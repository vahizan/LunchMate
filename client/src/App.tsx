import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Results from "@/pages/results";
import RestaurantDetails from "@/pages/restaurant-details";
import { useState } from "react";
import { TeamModal } from "./components/TeamModal";
import { ProfileModal } from "./components/ProfileModal";
import EnvDebugger from "./components/EnvDebugger";
import AppProvider from "./context/AppContext";
import { RestaurantProvider } from "./context/RestaurantContext";

function App() {
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  return (
    <AppProvider>
    <RestaurantProvider>
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        {/* Environment Variables Debugger */}
        {/* <EnvDebugger /> */}
      
        <header className="bg-white shadow-md sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary">Find my lunch</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                className="text-neutral-500 hover:text-primary" 
                onClick={() => setTeamModalOpen(true)}
              >
                <i className="fas fa-users"></i>
              </button>
              <button 
                className="text-neutral-500 hover:text-primary" 
                onClick={() => setProfileModalOpen(true)}
              >
                <i className="fas fa-user-circle text-xl"></i>
              </button>
            </div>
          </div>
        </header>

        <Switch>
          <Route path="/" component={Home} />
          <Route path="/results" component={Results} />
          <Route path="/restaurant/:id" component={RestaurantDetails} />
          <Route component={NotFound} />
        </Switch>
      

        {/* Mobile bottom navigation */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-10">
          <div className="flex justify-around">
            <button className="py-3 px-5 text-primary flex flex-col items-center">
              <i className="fas fa-search"></i>
              <span className="text-xs mt-1">Find</span>
            </button>
            <button className="py-3 px-5 text-neutral-500 flex flex-col items-center">
              <i className="fas fa-history"></i>
              <span className="text-xs mt-1">History</span>
            </button>
            <button 
              className="py-3 px-5 text-neutral-500 flex flex-col items-center"
              onClick={() => setTeamModalOpen(true)}
            >
              <i className="fas fa-users"></i>
              <span className="text-xs mt-1">Team</span>
            </button>
            <button 
              className="py-3 px-5 text-neutral-500 flex flex-col items-center"
              onClick={() => setProfileModalOpen(true)}
            >
              <i className="fas fa-user"></i>
              <span className="text-xs mt-1">Profile</span>
            </button>
          </div>
        </nav>

        {/* Modals */}
        <TeamModal isOpen={teamModalOpen} onClose={() => setTeamModalOpen(false)} />
        <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
      </div>
    
      <Toaster />
    </QueryClientProvider>
    </RestaurantProvider>
    </AppProvider>
  );
}

export default App;
