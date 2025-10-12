import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import PostCard from '../components/PostCard';
import { PlusIcon, TrashIcon, PencilIcon } from '../components/Icons';
import { PostContext } from '../context/PostContext';
import { Post } from '../types';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
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


const FeedPage: React.FC = () => {
  const postContext = useContext(PostContext);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  if (!postContext) {
    return null;
  }

  const { posts, updatePost } = postContext;

  const handleSaveEdit = (updatedData: { caption: string; locationTag: string }) => {
    if (editingPost) {
      updatePost(editingPost.id, updatedData);
      setEditingPost(null);
    }
  };


  return (
    <div className="bg-stone-50 min-h-screen">
      <Header 
        title="Barista AI" 
        action={
          <Link to="/add-post" className="text-stone-700">
            <PlusIcon className="w-7 h-7" />
          </Link>
        }
      />
      <main>
        {posts.map(post => (
          <PostCard key={post.id} post={post} onEdit={setEditingPost} />
        ))}
        {posts.length === 0 && (
          <div className="text-center p-8 text-stone-500">
            <p>Welcome! It looks a bit empty here.</p>
            <p className="mt-2">Why not be the first to share a coffee moment?</p>
          </div>
        )}
      </main>
      
      {editingPost && (
        <EditPostModal 
            post={editingPost}
            onClose={() => setEditingPost(null)}
            onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default FeedPage;