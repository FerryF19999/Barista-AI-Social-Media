import { Conversation, Post, User } from '../types';

const baseUsers: Array<Omit<User, 'following' | 'followers'> & { following: string[]; followers: string[] }> = [
  {
    id: 'demo-ayu',
    name: 'Ayu Barista',
    email: 'ayu@barista.demo',
    avatarUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=300&q=80',
    bio: 'Barista spesialis pour-over dan pecinta kopi lokal.',
    following: ['demo-budi'],
    followers: ['demo-budi'],
  },
  {
    id: 'demo-budi',
    name: 'Budi Roaster',
    email: 'budi@barista.demo',
    avatarUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=300&q=80',
    bio: 'Roaster rumahan yang suka bereksperimen dengan single origin.',
    following: ['demo-ayu'],
    followers: ['demo-ayu'],
  },
  {
    id: 'demo-citra',
    name: 'Citra Coffee Explorer',
    email: 'citra@barista.demo',
    avatarUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=300&q=80',
    bio: 'Pemburu kedai kopi estetik di Jakarta dan Bandung.',
    following: ['demo-ayu'],
    followers: [],
  },
];

interface BaseComment {
  id: string;
  text: string;
  authorId: string;
}

interface BasePost {
  id: string;
  authorId: string;
  imageUrl: string;
  caption: string;
  locationTag: string;
  likes: string[];
  views: string[];
  comments: BaseComment[];
}

const basePosts: BasePost[] = [
  {
    id: 'demo-post-flatwhite',
    authorId: 'demo-ayu',
    imageUrl: 'https://images.unsplash.com/photo-1527169402691-feff5539e52c?auto=format&fit=crop&w=900&q=80',
    caption: 'Flat white dengan profil rasa caramel dan citrus dari beans Flores Bajawa.',
    locationTag: 'Sejuk Coffee Lab',
    likes: ['demo-budi', 'demo-citra'],
    views: ['demo-ayu', 'demo-budi', 'demo-citra'],
    comments: [
      {
        id: 'demo-comment-1',
        text: 'Aroma citrusnya berasa banget! Mau coba weekend ini.',
        authorId: 'demo-citra',
      },
    ],
  },
  {
    id: 'demo-post-handbrew',
    authorId: 'demo-budi',
    imageUrl: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=900&q=80',
    caption: 'Hand brew V60 Ethiopia Konga, catatan rasa berry dan jasmine.',
    locationTag: 'Rumah Roastery',
    likes: ['demo-ayu'],
    views: ['demo-ayu', 'demo-budi'],
    comments: [
      {
        id: 'demo-comment-2',
        text: 'Looks tasty! Disajikan pakai suhu berapa?',
        authorId: 'demo-ayu',
      },
    ],
  },
  {
    id: 'demo-post-affogato',
    authorId: 'demo-citra',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
    caption: 'Affogato dengan gelato vanilla lokal, cocok buat siang panas.',
    locationTag: 'Sunyi Coffee Bar',
    likes: ['demo-ayu'],
    views: ['demo-ayu', 'demo-citra'],
    comments: [],
  },
];

const baseConversations: Conversation[] = [
  {
    id: 'demo-conv-1',
    title: 'Cari kopi untuk kerja',
    timestamp: Date.now() - 1000 * 60 * 60 * 6,
    messages: [
      {
        id: 'demo-msg-1',
        sender: 'user',
        text: 'Aku butuh rekomendasi kedai kopi buat kerja fokus area Tebet.',
      },
      {
        id: 'demo-msg-2',
        sender: 'ai',
        text: 'Coba mampir ke Beanery Tebet, suasana tenang dengan wifi cepat. Alternatif lain ada Pigeonhole yang punya area co-working.',
        recommendations: [
          {
            name: 'Beanery Tebet',
            rating: 4.6,
            imageUrl: 'https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?auto=format&fit=crop&w=600&q=80',
            description: 'Kopi single origin dan meja kerja luas, cocok untuk fokus.',
          },
        ],
      },
    ],
  },
];

export const createDemoUsers = (): User[] =>
  baseUsers.map((user) => ({
    ...user,
    following: [...user.following],
    followers: [...user.followers],
  }));

export const createDemoPosts = (users: User[]): Post[] =>
  basePosts.map((post) => {
    const author = users.find((u) => u.id === post.authorId) ?? users[0];

    return {
      id: post.id,
      author,
      imageUrl: post.imageUrl,
      caption: post.caption,
      locationTag: post.locationTag,
      likes: [...post.likes],
      isBookmarked: false,
      comments: post.comments.map((comment) => ({
        id: comment.id,
        text: comment.text,
        author: users.find((u) => u.id === comment.authorId) ?? author,
      })),
      views: [...post.views],
    };
  });

export const createDemoConversations = (): Conversation[] =>
  baseConversations.map((conversation) => ({
    ...conversation,
    messages: conversation.messages.map((message) => ({
      ...message,
      recommendations: message.recommendations ? [...message.recommendations] : undefined,
      sources: message.sources ? [...message.sources] : undefined,
    })),
  }));
