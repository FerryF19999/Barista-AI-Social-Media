import React, { useContext, useEffect, useState, useRef, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../types';
import { AuthContext } from '../context/AuthContext';
import { PostContext } from '../context/PostContext';
import { HeartIcon, ChatBubbleIcon, BookmarkIcon, MapPinIcon, EllipsisVerticalIcon, PencilIcon, TrashIcon } from './Icons';

interface PostCardProps {
  post: Post;
  onEdit?: (post: Post) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onEdit }) => {
  const authContext = useContext(AuthContext);
  const postContext = useContext(PostContext);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const commentInputRef = useRef<HTMLInputElement>(null);

  const { toggleLike, toggleBookmark, incrementPostView, deletePost, addComment } = postContext || {};
  const { user, toggleFollow } = authContext || {};
  
  useEffect(() => {
    if (!incrementPostView || !post.id) return;
    incrementPostView(post.id).catch(error => {
      console.error('Failed to record post view', error);
    });
  }, [incrementPostView, post.id]);

  if (!user || !postContext || !toggleFollow || !addComment) return null;

  const isLikedByUser = post.likes.includes(user.id);
  const isFollowingAuthor = user.following.includes(post.author.id);
  const isOwnPost = post.author.id === user.id;

  const handleDelete = async () => {
      if(window.confirm('Apakah Anda yakin ingin menghapus postingan ini?')) {
          try {
              await deletePost?.(post.id);
          } catch (error) {
              console.error('Failed to delete post', error);
          }
      }
      setIsMenuOpen(false);
  }

  const handleEdit = () => {
    onEdit?.(post);
    setIsMenuOpen(false);
  }

  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedComment = commentText.trim();
    if (trimmedComment) {
      try {
        await addComment(post.id, trimmedComment);
        setCommentText('');
      } catch (error) {
        console.error('Failed to add comment', error);
      }
    }
  };

  return (
    <div className="bg-white border-b border-stone-200 mb-0.5">
      {/* Post Header */}
      <div className="flex items-center p-3">
        <Link to={`/profile/${post.author.id}`} className="flex items-center flex-grow">
            <img src={post.author.avatarUrl} alt={post.author.name} className="w-10 h-10 rounded-full object-cover" />
            <div className="ml-3">
                <span className="font-bold text-sm text-stone-800 hover:underline">{post.author.name}</span>
                {post.locationTag && (
                    <div className="flex items-center text-xs text-stone-500">
                        <MapPinIcon className="w-3 h-3 mr-1" />
                        <span>{post.locationTag}</span>
                    </div>
                )}
            </div>
        </Link>
         {!isOwnPost ? (
            <button 
              onClick={() => toggleFollow(post.author.id)}
              className={`text-sm font-bold py-1 px-4 rounded-md transition-colors ${
                isFollowingAuthor 
                ? 'bg-stone-200 text-stone-700 hover:bg-stone-300' 
                : 'bg-amber-600 text-white hover:bg-amber-700'
              }`}
            >
              {isFollowingAuthor ? 'Mengikuti' : 'Ikuti'}
            </button>
        ) : (
          <div className="relative">
             <button onClick={() => setIsMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-stone-100">
                <EllipsisVerticalIcon className="w-5 h-5 text-stone-600"/>
            </button>
            {isMenuOpen && (
                <div 
                    className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-stone-200"
                    onMouseLeave={() => setIsMenuOpen(false)}
                >
                    <button onClick={handleEdit} className="w-full flex items-center px-4 py-2 text-sm text-stone-700 hover:bg-stone-100">
                        <PencilIcon className="w-4 h-4 mr-3"/> Ubah
                    </button>
                    <button onClick={handleDelete} className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        <TrashIcon className="w-4 h-4 mr-3"/> Hapus
                    </button>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Post Image */}
      <img src={post.imageUrl} alt={post.caption} className="w-full h-auto object-cover aspect-square" />
    
      {/* Post Actions */}
      <div className="flex justify-between items-center p-3">
        <div className="flex space-x-4 items-center">
            <div className="flex items-center space-x-2">
                <button onClick={() => toggleLike && toggleLike(post.id)} className="flex items-center group">
                    <HeartIcon solid={isLikedByUser} className={`w-7 h-7 transition-colors group-hover:text-red-500 ${isLikedByUser ? 'text-red-500' : 'text-stone-600'}`} />
                </button>
                {post.likes.length > 0 && (
                  <span className="font-bold text-sm text-stone-800 select-none">
                    {post.likes.length.toLocaleString()} suka
                  </span>
                )}
            </div>
            <button onClick={() => commentInputRef.current?.focus()} className="flex items-center space-x-1.5 group">
                <ChatBubbleIcon className="w-7 h-7 text-stone-600 group-hover:text-stone-800" />
            </button>
        </div>
        <button onClick={() => toggleBookmark && toggleBookmark(post.id)} className="group">
           <BookmarkIcon solid={post.isBookmarked} className={`w-7 h-7 transition-colors group-hover:text-stone-800 ${post.isBookmarked ? 'text-stone-800' : 'text-stone-600'}`} />
        </button>
      </div>

      {/* Post Details */}
      <div className="px-3 pb-4">
         <p className="text-sm text-stone-800">
            <Link to={`/profile/${post.author.id}`} className="font-bold mr-2 hover:underline">{post.author.name}</Link>
            {post.caption}
         </p>
         <p className="text-xs text-stone-500 mt-2">{post.views.length.toLocaleString()} tayangan</p>
         {/* Comments Section */}
         <div className="mt-2 space-y-1">
            {post.comments.map(comment => (
                <div key={comment.id} className="text-sm">
                    <Link to={`/profile/${comment.author.id}`} className="font-bold mr-2 hover:underline text-stone-800">{comment.author.name}</Link>
                    <span className="text-stone-700">{comment.text}</span>
                </div>
            ))}
        </div>
        {/* Comment Input Form */}
        <form onSubmit={handleCommentSubmit} className="mt-3 flex items-center space-x-2">
            <img src={user.avatarUrl} alt="Your avatar" className="w-7 h-7 rounded-full object-cover"/>
            <input
                ref={commentInputRef}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Tambahkan komentar..."
                className="flex-grow bg-transparent text-sm text-stone-700 placeholder-stone-400 focus:outline-none"
                aria-label="Add a comment"
            />
            <button
                type="submit"
                disabled={!commentText.trim()}
                className="text-sm font-bold text-amber-700 hover:text-amber-800 disabled:text-stone-400 transition-colors"
            >
                Kirim
            </button>
        </form>
      </div>
    </div>
  );
};

export default PostCard;