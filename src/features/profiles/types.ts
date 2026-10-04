export type OwnProfileDTO = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  phoneVerified: boolean;
  optionalIdentityVerified: boolean;
  ratingAverage: number;
  ratingCount: number;
  completedInteractionCount: number;
  responseRate: number | null;
  onboardingCompleted: boolean;
  createdAt: string;
};

export type PublicProfileDTO = Omit<OwnProfileDTO, "onboardingCompleted">;
