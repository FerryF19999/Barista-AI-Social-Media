

// FIX: Removed conflicting self-import of the 'User' type.

export interface Post {
  id: string;
  author: User;
  imageUrl: string;
  caption: string;
  locationTag: string;
  likes: string[]; // Replaced isLiked
  isBookmarked: boolean;
  comments: Comment[];
  views: string[];
}
export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
  bio?: string;
  following: string[];
  followers: string[];
}

export interface Comment {
  id: string;
  text: string;
  author: User;
}



export interface Coffee {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
}

export interface CoffeeShop {
  name: string;
  rating: number;
  imageUrl: string;
  description: string;
}

export interface ChatMessage {
  id: string;
  text?: string;
  sender: 'user' | 'ai';
  recommendations?: CoffeeShop[];
  isLoading?: boolean;
  sources?: { uri: string; title: string }[];
}

export interface Conversation {
  id:string;
  title: string;
  timestamp: number;
  messages: ChatMessage[];
}


export interface CoffeeShopAnalysis {
  name: string;
  subtitle: string;
  why: {
    paragraph: string;
    points: string[];
  };
  hours: {
    day: string;
    time: string;
    status?: 'Buka' | 'Tutup';
  }[];
  facilities: string[];
  scores: {
    label: string;
    value: number;
  }[];
}