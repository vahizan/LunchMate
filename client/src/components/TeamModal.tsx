import { useState, useEffect, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppContext } from "@/context/AppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePlaces } from "@/hooks/use-places";

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TeamQueryResult {
  id: string;
  [key: string]: any;
}

export function TeamModal({ isOpen, onClose }: TeamModalProps) {
  const { toast } = useToast();
  const { restaurants } = useContext(AppContext);
  const [teamLink, setTeamLink] = useState("");
  const { getPhotoUrl } = usePlaces();

  // Fetch team data
  const { data: team, isLoading } = useQuery<TeamQueryResult>({
    queryKey: ['/api/team'],
    enabled: isOpen,
  });

  // Vote for restaurant mutation
  const voteMutation = useMutation({
    mutationFn: async ({ restaurantId }: { restaurantId: string }) => {
      const res = await apiRequest("POST", "/api/team/vote", { restaurantId });
      return res.json();
    },
    onSuccess: () => {
      // Refetch team data after voting
      // queryClient.invalidateQueries({ queryKey: ['/api/team'] });
    },
  });

  // Generate team link when modal opens
  useEffect(() => {
    if (isOpen) {
      const host = window.location.host;
      // Use a default team ID if team data is not available
      const teamId = team && 'id' in team ? team.id : "tech-team";
      setTeamLink(`${window.location.protocol}//${host}/team/${teamId}`);
    }
  }, [isOpen, team]);

  // Copy team link to clipboard
  const copyTeamLink = () => {
    navigator.clipboard.writeText(teamLink);
    toast({
      title: "Link copied",
      description: "Team link copied to clipboard",
    });
  };

  // Handle voting for a restaurant
  const handleVote = (restaurantId: string) => {
    voteMutation.mutate({ restaurantId });
  };

  // Finalize team choice
  const finalizeChoice = () => {
    // Logic to finalize team choice
    toast({
      title: "Team choice finalised",
      description: "Everyone has been notified of the final selection",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Team Voting</DialogTitle>
        </DialogHeader>
        
        <div className="py-2">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Current group: <span className="text-primary">Tech Team</span></h3>
              <Button variant="ghost" className="h-auto p-0 text-primary text-sm">
                Change
              </Button>
            </div>
            <p className="text-sm text-gray-500">4 members • Created by you</p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium mb-2">Vote on today's lunch</h3>
            <p className="text-sm text-gray-500 mb-4">Share the link to let your team members vote</p>
            
            <div className="relative mb-4">
              <Input 
                value={teamLink}
                readOnly
                className="pr-10 bg-gray-50"
              />
              <Button 
                variant="ghost" 
                className="absolute right-0 top-0 h-full px-3"
                onClick={copyTeamLink}
              >
                <i className="fas fa-copy text-primary"></i>
              </Button>
            </div>
            
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
              {restaurants?.slice(0, 3).map((restaurant) => (
                <div key={restaurant.place_id} className="p-3 flex justify-between items-center">
                  <div className="flex items-center">
                    {restaurant.photos && restaurant.photos[0] ? (
                      <img
                        src={getPhotoUrl(restaurant.photos[0].photo_reference, 64)}
                        alt={restaurant.name}
                        className="w-10 h-10 rounded-md object-cover mr-3"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-gray-200 mr-3"></div>
                    )}
                    <div>
                      <h4 className="font-medium">{restaurant.name}</h4>
                      <p className="text-xs text-gray-500">
                        {restaurant.types?.slice(0, 1).join(', ')} • {restaurant.distance?.toFixed(1)} km
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-2">
                      {restaurant.votes || 0}/4
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`w-8 h-8 p-0 rounded-full ${restaurant.hasVoted ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}
                      onClick={() => handleVote(restaurant.place_id)}
                    >
                      <i className="fas fa-thumbs-up"></i>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" className="flex-1">
              Add restaurant
            </Button>
            <Button onClick={finalizeChoice} className="flex-1">
              Finalise choice
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
