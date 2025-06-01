import {
  User, InsertUser,
  Favorite, InsertFavorite,
  VisitHistory, InsertVisitHistory,
  Team, InsertTeam,
  TeamMember, InsertTeamMember,
  TeamSuggestion, InsertTeamSuggestion,
  TeamVote, InsertTeamVote,
  CrowdData, InsertCrowdData
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // History methods
  getHistory(userId?: number): Promise<VisitHistory[]>;
  addToHistory(history: Partial<InsertVisitHistory>): Promise<VisitHistory>;
  removeFromHistory(id: number): Promise<void>;
  clearHistory(userId?: number): Promise<void>;
  
  // Favorites methods
  getFavorites(userId?: number): Promise<Favorite[]>;
  addFavorite(favorite: Partial<InsertFavorite>): Promise<Favorite>;
  removeFavorite(id: number): Promise<void>;
  
  // Team methods
  getTeams(userId?: number): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  
  // Team members methods
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  removeTeamMember(id: number): Promise<void>;
  
  // Team suggestions methods
  getTeamSuggestions(teamId: number): Promise<TeamSuggestion[]>;
  addTeamSuggestion(suggestion: InsertTeamSuggestion): Promise<TeamSuggestion>;
  
  // Team votes methods
  getTeamVotes(suggestionId: number): Promise<TeamVote[]>;
  addTeamVote(vote: InsertTeamVote): Promise<TeamVote>;
  
  // Crowd data methods
  getCrowdData(restaurantId: string): Promise<CrowdData | undefined>;
  getAllCrowdData(): Promise<CrowdData[]>;
  saveCrowdData(data: InsertCrowdData): Promise<CrowdData>;
  updateCrowdData(restaurantId: string, data: Partial<InsertCrowdData>): Promise<CrowdData | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private visitHistory: Map<number, VisitHistory>;
  private favorites: Map<number, Favorite>;
  private teams: Map<number, Team>;
  private teamMembers: Map<number, TeamMember>;
  private teamSuggestions: Map<number, TeamSuggestion>;
  private teamVotes: Map<number, TeamVote>;
  private crowdDataMap: Map<string, CrowdData>;
  
  private currentUserId: number;
  private currentHistoryId: number;
  private currentFavoriteId: number;
  private currentTeamId: number;
  private currentTeamMemberId: number;
  private currentTeamSuggestionId: number;
  private currentTeamVoteId: number;
  private currentCrowdDataId: number;

  constructor() {
    this.users = new Map();
    this.visitHistory = new Map();
    this.favorites = new Map();
    this.teams = new Map();
    this.teamMembers = new Map();
    this.teamSuggestions = new Map();
    this.teamVotes = new Map();
    this.crowdDataMap = new Map();
    
    this.currentUserId = 1;
    this.currentHistoryId = 1;
    this.currentFavoriteId = 1;
    this.currentTeamId = 1;
    this.currentTeamMemberId = 1;
    this.currentTeamSuggestionId = 1;
    this.currentTeamVoteId = 1;
    this.currentCrowdDataId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      created_at: now
    };
    this.users.set(id, user);
    return user;
  }

  // History methods
  async getHistory(userId?: number): Promise<VisitHistory[]> {
    const history = Array.from(this.visitHistory.values());
    
    if (userId) {
      return history.filter(h => h.userId === userId);
    }
    
    return history;
  }

  async addToHistory(partialHistory: Partial<InsertVisitHistory>): Promise<VisitHistory> {
    const id = this.currentHistoryId++;
    const now = new Date();
    
    const history: VisitHistory = {
      id,
      userId: partialHistory.userId,
      restaurantId: partialHistory.restaurantId!,
      restaurantName: partialHistory.restaurantName!,
      visitDate: partialHistory.visitDate || now,
    };
    
    this.visitHistory.set(id, history);
    return history;
  }

  async removeFromHistory(id: number): Promise<void> {
    this.visitHistory.delete(id);
  }

  async clearHistory(userId?: number): Promise<void> {
    if (userId) {
      Array.from(this.visitHistory.entries())
        .filter(([_, history]) => history.userId === userId)
        .forEach(([id]) => this.visitHistory.delete(id));
    } else {
      this.visitHistory.clear();
    }
  }

  // Favorites methods
  async getFavorites(userId?: number): Promise<Favorite[]> {
    const favorites = Array.from(this.favorites.values());
    
    if (userId) {
      return favorites.filter(f => f.userId === userId);
    }
    
    return favorites;
  }

  async addFavorite(partialFavorite: Partial<InsertFavorite>): Promise<Favorite> {
    const id = this.currentFavoriteId++;
    const now = new Date();
    
    const favorite: Favorite = {
      id,
      userId: partialFavorite.userId,
      restaurantId: partialFavorite.restaurantId!,
      restaurantData: partialFavorite.restaurantData!,
      created_at: now,
    };
    
    this.favorites.set(id, favorite);
    return favorite;
  }

  async removeFavorite(id: number): Promise<void> {
    this.favorites.delete(id);
  }

  // Team methods
  async getTeams(userId?: number): Promise<Team[]> {
    const teams = Array.from(this.teams.values());
    
    if (userId) {
      // Get teams created by user or teams where user is a member
      const memberTeamIds = Array.from(this.teamMembers.values())
        .filter(m => m.userId === userId)
        .map(m => m.teamId);
      
      return teams.filter(t => t.createdBy === userId || memberTeamIds.includes(t.id));
    }
    
    return teams;
  }

  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = this.currentTeamId++;
    const now = new Date();
    
    const team: Team = {
      id,
      name: insertTeam.name,
      createdBy: insertTeam.createdBy,
      inviteCode: insertTeam.inviteCode,
      created_at: now,
    };
    
    this.teams.set(id, team);
    
    // Automatically add creator as a team member
    await this.addTeamMember({
      teamId: id,
      userId: insertTeam.createdBy,
    });
    
    return team;
  }

  // Team members methods
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values())
      .filter(m => m.teamId === teamId);
  }

  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const id = this.currentTeamMemberId++;
    const now = new Date();
    
    const teamMember: TeamMember = {
      id,
      teamId: member.teamId,
      userId: member.userId,
      joined_at: now,
    };
    
    this.teamMembers.set(id, teamMember);
    return teamMember;
  }

  async removeTeamMember(id: number): Promise<void> {
    this.teamMembers.delete(id);
  }

  // Team suggestions methods
  async getTeamSuggestions(teamId: number): Promise<TeamSuggestion[]> {
    return Array.from(this.teamSuggestions.values())
      .filter(s => s.teamId === teamId);
  }

  async addTeamSuggestion(suggestion: InsertTeamSuggestion): Promise<TeamSuggestion> {
    const id = this.currentTeamSuggestionId++;
    const now = new Date();
    
    const teamSuggestion: TeamSuggestion = {
      id,
      teamId: suggestion.teamId,
      restaurantId: suggestion.restaurantId,
      restaurantData: suggestion.restaurantData,
      created_at: now,
    };
    
    this.teamSuggestions.set(id, teamSuggestion);
    return teamSuggestion;
  }

  // Team votes methods
  async getTeamVotes(suggestionId: number): Promise<TeamVote[]> {
    return Array.from(this.teamVotes.values())
      .filter(v => v.suggestionId === suggestionId);
  }

  async addTeamVote(vote: InsertTeamVote): Promise<TeamVote> {
    // Check if user already voted for this suggestion
    const existingVote = Array.from(this.teamVotes.values())
      .find(v => v.suggestionId === vote.suggestionId && v.userId === vote.userId);
    
    if (existingVote) {
      return existingVote;
    }
    
    const id = this.currentTeamVoteId++;
    const now = new Date();
    
    const teamVote: TeamVote = {
      id,
      suggestionId: vote.suggestionId,
      userId: vote.userId,
      created_at: now,
    };
    
    this.teamVotes.set(id, teamVote);
    return teamVote;
  }
  
  // Crowd data methods
  async getCrowdData(restaurantId: string): Promise<CrowdData | undefined> {
    return Array.from(this.crowdDataMap.values()).find(
      (data) => data.restaurantId === restaurantId
    );
  }
  
  async getAllCrowdData(): Promise<CrowdData[]> {
    return Array.from(this.crowdDataMap.values());
  }
  
  async saveCrowdData(data: InsertCrowdData): Promise<CrowdData> {
    const id = this.currentCrowdDataId++;
    const now = new Date();
    
    const crowdDataEntry: CrowdData = {
      id,
      restaurantId: data.restaurantId,
      restaurantName: data.restaurantName,
      crowdLevel: data.crowdLevel,
      crowdPercentage: data.crowdPercentage,
      peakHours: data.peakHours,
      averageTimeSpent: data.averageTimeSpent,
      lastUpdated: now,
      source: data.source || "google",
    };
    
    this.crowdDataMap.set(data.restaurantId, crowdDataEntry);
    return crowdDataEntry;
  }
  
  async updateCrowdData(restaurantId: string, data: Partial<InsertCrowdData>): Promise<CrowdData | undefined> {
    const existingData = await this.getCrowdData(restaurantId);
    
    if (!existingData) {
      return undefined;
    }
    
    const updatedData: CrowdData = {
      ...existingData,
      ...data,
      lastUpdated: new Date(),
    };
    
    this.crowdDataMap.set(restaurantId, updatedData);
    return updatedData;
  }
}

export const storage = new MemStorage();
