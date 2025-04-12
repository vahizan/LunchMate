import { useContext, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { toast } = useToast();
  const { 
    userPreferences,
    setUserPreferences,
    visitHistory,
    clearVisitHistory,
    removeFromHistory
  } = useContext(AppContext);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    defaultLocation: "",
    favoriteCuisines: [] as string[]
  });

  // Update form data when userPreferences changes
  useEffect(() => {
    if (userPreferences) {
      setFormData({
        name: userPreferences.name || "",
        email: userPreferences.email || "",
        defaultLocation: userPreferences.defaultLocation?.address || "",
        favoriteCuisines: userPreferences.favoriteCuisines || []
      });
    }
  }, [userPreferences, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCuisineChange = (value: string) => {
    let newCuisines;
    if (formData.favoriteCuisines.includes(value)) {
      newCuisines = formData.favoriteCuisines.filter(c => c !== value);
    } else {
      newCuisines = [...formData.favoriteCuisines, value];
    }
    setFormData(prev => ({ ...prev, favoriteCuisines: newCuisines }));
  };

  const saveChanges = () => {
    setUserPreferences({
      ...userPreferences,
      name: formData.name,
      email: formData.email,
      defaultLocation: {
        address: formData.defaultLocation,
        lat: userPreferences?.defaultLocation?.lat || 0,
        lng: userPreferences?.defaultLocation?.lng || 0
      },
      favoriteCuisines: formData.favoriteCuisines
    });
    
    toast({
      title: "Profile updated",
      description: "Your preferences have been saved",
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Your Profile</DialogTitle>
        </DialogHeader>
        
        <div className="py-2">
          <div className="mb-6">
            <h3 className="font-medium mb-3">Account Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Your name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@example.com"
                />
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium mb-3">Default Preferences</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="defaultLocation">Default location</Label>
                <Input 
                  id="defaultLocation"
                  name="defaultLocation"
                  value={formData.defaultLocation}
                  onChange={handleInputChange}
                  placeholder="Enter your default location"
                />
              </div>
              <div>
                <Label>Favorite cuisines</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Italian", "Japanese", "Indian", "Chinese", "Mexican", "American"].map((cuisine) => (
                    <Button
                      key={cuisine}
                      type="button"
                      variant={formData.favoriteCuisines.includes(cuisine) ? "default" : "outline"}
                      className="h-8 text-sm"
                      onClick={() => handleCuisineChange(cuisine)}
                    >
                      {cuisine}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium mb-3">Visit History</h3>
            {visitHistory.length === 0 ? (
              <p className="text-sm text-gray-500">No visit history yet.</p>
            ) : (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-40 overflow-y-auto">
                {visitHistory.map((visit) => (
                  <div key={visit.id} className="p-3 flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{visit.name}</h4>
                      <p className="text-xs text-gray-500">
                        Visited {new Date(visit.visitDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-500 hover:text-red-500"
                      onClick={() => removeFromHistory(visit.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {visitHistory.length > 0 && (
              <Button 
                variant="ghost" 
                className="w-full mt-2 text-sm text-primary"
                onClick={clearVisitHistory}
              >
                Clear all history
              </Button>
            )}
          </div>
          
          <DialogFooter className="flex">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={saveChanges} className="flex-1">
              Save changes
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
