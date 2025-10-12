import React, { useContext, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { PostContext } from '../context/PostContext';
import Header from '../components/Header';
import { Post, User } from '../types';
import { EyeIcon, BookmarkIcon, HeartIcon, HomeIcon, CameraIcon, TrashIcon, PencilIcon, ChevronDownIcon, CheckCircleIcon } from '../components/Icons';

// Reusable Edit Post Modal Component
const EditPostModal: React.FC<{
  post: Post;
  onClose: () => void;
  onSave: (updatedData: { caption: string; locationTag: string }) => void;
}> = ({ post, onClose, onSave }) => {
  const [caption, setCaption] = useState(post.caption);
  const [locationTag, setLocationTag] = useState(post.locationTag);

  const handleSave = () => {
    onSave({ caption, locationTag });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-stone-800">Ubah Postingan</h2>
        <div>
          <label htmlFor="edit-caption" className="block text-sm font-medium text-stone-700">Caption</label>
          <textarea
            id="edit-caption"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            rows={3}
            className="w-full p-2 mt-1 bg-stone-50 border border-stone-300 rounded-lg text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label htmlFor="edit-location" className="block text-sm font-medium text-stone-700">Tag Lokasi</label>
          <input
            id="edit-location"
            type="text"
            value={locationTag}
            onChange={e => setLocationTag(e.target.value)}
            className="w-full p-2 mt-1 bg-stone-50 border border-stone-300 rounded-lg text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex space-x-2 pt-2">
          <button onClick={onClose} className="w-full bg-stone-200 text-stone-700 font-bold py-2 rounded-lg hover:bg-stone-300 transition-colors">Batal</button>
          <button onClick={handleSave} className="w-full bg-amber-700 text-white font-bold py-2 rounded-lg hover:bg-amber-800 transition-colors">Simpan</button>
        </div>
      </div>
    </div>
  );
};

const AccountSwitcherModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    currentUser: User;
    onSwitch: (userId: string) => void;
    onLogout: () => void;
}> = ({ isOpen, onClose, users, currentUser, onSwitch, onLogout }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold text-stone-800 text-center p-4 border-b border-stone-200">Ganti Akun</h2>
                <ul className="py-2 max-h-60 overflow-y-auto">
                    {users.map(user => (
                        <li key={user.id}>
                            <button
                                onClick={() => onSwitch(user.id)}
                                className="w-full flex items-center text-left px-4 py-3 hover:bg-stone-100 transition-colors"
                            >
                                <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover mr-3" />
                                <span className="flex-grow font-semibold text-stone-700">{user.name}</span>
                                {user.id === currentUser.id && <CheckCircleIcon className="w-6 h-6 text-amber-600" />}
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="border-t border-stone-200 p-2">
                    <button 
                        onClick={() => navigate('/auth?mode=login')}
                        className="w-full text-left px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                        Masuk ke Akun Lain
                    </button>
                    <button 
                        onClick={onLogout}
                        className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        Keluar
                    </button>
                </div>
            </div>
        </div>
    );
};

const Stat: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="text-center">
        <span className="font-bold text-lg text-stone-800">{value}</span>
        <span className="block text-xs text-stone-500">{label}</span>
    </div>
);

const PostGrid: React.FC<{
    posts: Post[];
    isOwnProfile: boolean;
    showViews?: boolean;
    onDelete: (postId: string) => void;
    onEdit: (post: Post) => void;
}> = ({ posts, isOwnProfile, showViews, onDelete, onEdit }) => {
    if (posts.length === 0) {
        return <p className="text-center text-stone-500 mt-8">Tidak ada postingan untuk ditampilkan.</p>;
    }

    const handleDeleteClick = (e: React.MouseEvent, postId: string) => {
        e.stopPropagation();
        if (window.confirm('Apakah Anda yakin ingin menghapus postingan ini?')) {
            onDelete(postId);
        }
    }

    const handleEditClick = (e: React.MouseEvent, post: Post) => {
        e.stopPropagation();
        onEdit(post);
    }

    return (
        <div className="grid grid-cols-3 gap-1">
            {posts.map(post => (
                <div key={post.id} className="relative aspect-square group">
                    <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover" />
                    {showViews && (
                        <div className="absolute bottom-1 left-1 flex items-center bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 rounded">
                            <EyeIcon className="w-3 h-3 mr-1" />
                            {post.views.length > 999 ? `${(post.views.length / 1000).toFixed(1)}k` : post.views.length}
                        </div>
                    )}
                    {isOwnProfile && (
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center space-x-4">
                            <button onClick={(e) => handleEditClick(e, post)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white/80 rounded-full">
                                <PencilIcon className="w-5 h-5 text-stone-800"/>
                            </button>
                            <button onClick={(e) => handleDeleteClick(e, post.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white/80 rounded-full">
                                <TrashIcon className="w-5 h-5 text-red-600"/>
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};


const ProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const authContext = useContext(AuthContext);
    const postContext = useContext(PostContext);

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [activeTab, setActiveTab] = useState<'posts' | 'liked' | 'saved'>('posts');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const { user: loggedInUser, users, logout, updateUser, toggleFollow, switchUser } = authContext || {};
    const { posts, deletePost, updatePost } = postContext || {};
    
    const profileUser = users?.find(u => u.id === userId);
    const isOwnProfile = loggedInUser?.id === profileUser?.id;

    useEffect(() => {
        if (profileUser) {
            setName(profileUser.name);
            setAvatarUrl(profileUser.avatarUrl);
            setBio(profileUser.bio || '');
            setIsEditingProfile(false);
        }
    }, [profileUser]);

    if (!authContext || !loggedInUser || !postContext || !posts || !toggleFollow || !deletePost || !updatePost || !users || !logout || !switchUser) {
        return null; 
    }
    
    if (!profileUser) {
        return (
            <div className="bg-white min-h-screen">
                 <Header title="Profil Tidak Ditemukan" />
                 <main className="p-4 text-center">
                     <p className="text-stone-600">Pengguna yang Anda cari tidak ada.</p>
                 </main>
            </div>
        );
    }
    
    const userPosts = posts.filter(p => p.author.id === profileUser.id);
    const likedPosts = posts.filter(p => p.likes.includes(profileUser.id));
    const savedPosts = posts.filter(p => isOwnProfile && p.isBookmarked);
    const totalLikesReceived = userPosts.reduce((sum, post) => sum + post.likes.length, 0);
    const isFollowing = loggedInUser.following.includes(profileUser.id);

    const handleSaveProfile = () => {
        if (!isOwnProfile) return;
        updateUser({ name, avatarUrl, bio });
        setIsEditingProfile(false);
    };

    const handleCancelProfile = () => {
        setName(profileUser.name);
        setAvatarUrl(profileUser.avatarUrl);
        setBio(profileUser.bio || '');
        setIsEditingProfile(false);
    };

    const handleAvatarClick = () => {
        if (!isEditingProfile) return;
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

     const handleSavePostEdit = (updatedData: { caption: string; locationTag: string }) => {
        if (editingPost) {
            updatePost(editingPost.id, updatedData);
            setEditingPost(null);
        }
    };

    const handleSwitchUser = (targetUserId: string) => {
        if (targetUserId === loggedInUser.id) {
            setIsSwitcherOpen(false);
            return;
        }
        switchUser(targetUserId);
        setIsSwitcherOpen(false);
        navigate('/feed', { replace: true });
    };
    
    const TabButton: React.FC<{ tabName: 'posts' | 'liked' | 'saved'; icon: React.ReactNode; }> = ({ tabName, icon }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`w-full py-3 flex justify-center items-center transition-colors duration-200 ${activeTab === tabName ? 'border-b-2 border-stone-800 text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}
        >
           {icon}
        </button>
    );

    return (
        <div className="bg-white min-h-screen">
            <Header title={isOwnProfile ? "Profil Saya" : profileUser.name} />
            <main className="p-4">
                <div className="flex items-center mb-6">
                     <img 
                        src={profileUser.avatarUrl} 
                        alt={profileUser.name} 
                        className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md mr-6"
                    />
                    <div className="flex-grow grid grid-cols-4 gap-1">
                        <Stat value={userPosts.length} label="Postingan" />
                        <Stat value={profileUser.followers.length} label="Pengikut" />
                        <Stat value={profileUser.following.length} label="Mengikuti" />
                        <Stat value={totalLikesReceived} label="Suka" />
                    </div>
                </div>
                <div>
                    <div className="flex items-center space-x-2">
                         <h2 className="text-xl font-bold text-stone-900">{profileUser.name}</h2>
                         {isOwnProfile && (
                            <button
                                onClick={() => setIsSwitcherOpen(true)}
                                className="-ml-1 p-1 rounded-full text-stone-500 hover:bg-stone-100 transition-colors"
                                aria-label="Ganti akun"
                            >
                                <ChevronDownIcon className="w-5 h-5" />
                            </button>
                         )}
                    </div>
                     <p className="text-sm text-stone-600">{profileUser.email}</p>
                     {profileUser.bio && <p className="text-sm text-stone-700 mt-2 whitespace-pre-wrap">{profileUser.bio}</p>}
                </div>
                 <div className="my-6">
                    {isOwnProfile ? (
                         <button onClick={() => setIsEditingProfile(true)} className="w-full text-center text-sm font-semibold py-2 bg-white rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors">
                            Ubah Profil
                        </button>
                    ) : (
                        <button 
                            onClick={() => toggleFollow(profileUser.id)}
                            className={`w-full text-center text-sm font-semibold py-2 rounded-lg transition-colors ${
                                isFollowing 
                                ? 'bg-stone-200 text-stone-700 hover:bg-stone-300 border border-stone-300' 
                                : 'bg-amber-600 text-white hover:bg-amber-700'
                            }`}
                        >
                            {isFollowing ? 'Mengikuti' : 'Ikuti'}
                        </button>
                    )}
                 </div>
            </main>

            {isEditingProfile && isOwnProfile ? (
                 <div className="p-4 border-t border-stone-200">
                    <h3 className="text-lg font-bold text-stone-800 mb-4">Ubah Profil</h3>
                    <div className="flex flex-col items-center mb-6">
                        <div className="relative">
                            <img 
                                src={avatarUrl} 
                                alt="Profile Preview" 
                                className="w-24 h-24 rounded-full object-cover border-2 border-white shadow-md"
                            />
                            <button 
                                type="button" 
                                onClick={handleAvatarClick}
                                className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
                                aria-label="Ubah foto profil"
                            >
                                <CameraIcon className="w-5 h-5 text-stone-700" />
                            </button>
                            <input 
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/png, image/jpeg, image/webp"
                            />
                        </div>
                    </div>
                     <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-stone-600 mb-1">Nama</label>
                            <input type="text" id="name" value={name} onChange={e => setName(e.target.value)}
                                className="w-full p-3 bg-stone-100 border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        </div>
                         <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-stone-600 mb-1">Bio</label>
                            <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows={3}
                                className="w-full p-3 bg-stone-100 border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                placeholder="Ceritakan sedikit tentang dirimu..." />
                        </div>
                        <div className="flex space-x-2 pt-2">
                            <button onClick={handleCancelProfile} className="w-full bg-stone-200 text-stone-700 font-bold py-2 rounded-lg hover:bg-stone-300 transition-colors">Batal</button>
                            <button onClick={handleSaveProfile} className="w-full bg-amber-700 text-white font-bold py-2 rounded-lg hover:bg-amber-800 transition-colors">Simpan</button>
                        </div>
                     </div>
                </div>
            ) : (
                <>
                    <div className="border-t border-b border-stone-200">
                        <div className="flex justify-around">
                           <TabButton tabName="posts" icon={<HomeIcon className="w-6 h-6" />} />
                           <TabButton tabName="liked" icon={<HeartIcon className="w-6 h-6" />} />
                           {isOwnProfile && <TabButton tabName="saved" icon={<BookmarkIcon className="w-6 h-6" />} />}
                        </div>
                    </div>
                    <div className="p-1">
                        <PostGrid 
                            posts={
                                activeTab === 'posts' ? userPosts :
                                activeTab === 'liked' ? likedPosts :
                                (savedPosts as Post[])
                            }
                            isOwnProfile={isOwnProfile && activeTab === 'posts'}
                            showViews={activeTab === 'posts'}
                            onDelete={deletePost}
                            onEdit={setEditingPost}
                        />
                    </div>
                </>
            )}
            {editingPost && (
                <EditPostModal
                    post={editingPost}
                    onClose={() => setEditingPost(null)}
                    onSave={handleSavePostEdit}
                />
            )}
            <AccountSwitcherModal 
                isOpen={isSwitcherOpen}
                onClose={() => setIsSwitcherOpen(false)}
                users={users}
                currentUser={loggedInUser}
                onSwitch={handleSwitchUser}
                onLogout={logout}
            />
        </div>
    );
};

export default ProfilePage;