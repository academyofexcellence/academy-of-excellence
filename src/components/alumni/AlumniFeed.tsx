import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Heart, MessageSquare, Trash2, Send } from 'lucide-react';

interface AlumniFeedProps {
  currentUserId: string;
  isStaffOrAdmin: boolean;
}

type CategoryType = 'general' | 'career' | 'arabic' | 'meetups';

export const AlumniFeed: React.FC<AlumniFeedProps> = ({ currentUserId, isStaffOrAdmin }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryType>('general');
  
  // New Post Form
  const [postContent, setPostContent] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);

  // Comments state (post_id -> array of comments)
  const [commentsMap, setCommentsMap] = useState<{ [postId: string]: any[] }>({});
  const [loadingComments, setLoadingComments] = useState<{ [postId: string]: boolean }>({});
  const [expandedComments, setExpandedComments] = useState<{ [postId: string]: boolean }>({});
  const [commentInput, setCommentInput] = useState<{ [postId: string]: string }>({});

  useEffect(() => {
    fetchPosts();
  }, [activeCategory]);

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const { data, error } = await supabase
        .from('alumni_posts')
        .select(`
          *,
          author:author_id (
            name,
            batch_number,
            courses:course_id (
              name
            )
          ),
          alumni_post_likes (
            user_id
          )
        `)
        .eq('category', activeCategory)
        .order('created_at', { ascending: false })
        .limit(50); // Keep result set small to minimize server payload

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error('Error fetching alumni posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;

    setSubmittingPost(true);
    try {
      const { error } = await supabase
        .from('alumni_posts')
        .insert([{
          content: postContent.trim(),
          category: activeCategory,
          author_id: currentUserId // Will be secured/verified by database RLS
        }]);

      if (error) throw error;
      setPostContent('');
      fetchPosts();
    } catch (err: any) {
      alert(`❌ Failed to share post: ${err.message}`);
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('alumni_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err: any) {
      alert(`❌ Failed to delete post: ${err.message}`);
    }
  };

  const handleLikeToggle = async (post: any) => {
    const isLiked = post.alumni_post_likes?.some((like: any) => like.user_id === currentUserId);
    
    try {
      if (isLiked) {
        // 1. Delete like record
        const { error: likeErr } = await supabase
          .from('alumni_post_likes')
          .delete()
          .match({ post_id: post.id, user_id: currentUserId });

        if (likeErr) throw likeErr;

        // 2. Decrement count
        const { error: countErr } = await supabase
          .from('alumni_posts')
          .update({ likes_count: Math.max(0, post.likes_count - 1) })
          .eq('id', post.id);

        if (countErr) throw countErr;

        // Update local state to save load resources
        setPosts(prev => prev.map(p => {
          if (p.id === post.id) {
            return {
              ...p,
              likes_count: Math.max(0, p.likes_count - 1),
              alumni_post_likes: p.alumni_post_likes.filter((l: any) => l.user_id !== currentUserId)
            };
          }
          return p;
        }));
      } else {
        // 1. Insert like record
        const { error: likeErr } = await supabase
          .from('alumni_post_likes')
          .insert([{ post_id: post.id, user_id: currentUserId }]);

        if (likeErr) throw likeErr;

        // 2. Increment count
        const { error: countErr } = await supabase
          .from('alumni_posts')
          .update({ likes_count: post.likes_count + 1 })
          .eq('id', post.id);

        if (countErr) throw countErr;

        // Update local state
        setPosts(prev => prev.map(p => {
          if (p.id === post.id) {
            return {
              ...p,
              likes_count: p.likes_count + 1,
              alumni_post_likes: [...(p.alumni_post_likes || []), { user_id: currentUserId }]
            };
          }
          return p;
        }));
      }
    } catch (err: any) {
      console.error('Error toggling like:', err);
    }
  };

  const loadComments = async (postId: string) => {
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const { data, error } = await supabase
        .from('alumni_comments')
        .select(`
          *,
          author:author_id (
            name,
            batch_number,
            courses:course_id (
              name
            )
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCommentsMap(prev => ({ ...prev, [postId]: data || [] }));
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const toggleComments = (postId: string) => {
    const isExpanded = !expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: isExpanded }));
    
    // Load comments only on-demand to save bandwidth & database reads
    if (isExpanded && !commentsMap[postId]) {
      loadComments(postId);
    }
  };

  const handleSendComment = async (postId: string) => {
    const text = commentInput[postId] || '';
    if (!text.trim()) return;

    try {
      const { data, error } = await supabase
        .from('alumni_comments')
        .insert([{
          post_id: postId,
          content: text.trim(),
          author_id: currentUserId
        }])
        .select(`
          *,
          author:author_id (
            name,
            batch_number,
            courses:course_id (
              name
            )
          )
        `)
        .single();

      if (error) throw error;

      // Update local comments map
      setCommentsMap(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data]
      }));
      setCommentInput(prev => ({ ...prev, [postId]: '' }));
    } catch (err: any) {
      alert(`❌ Failed to reply: ${err.message}`);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm('Are you sure you want to delete this reply?')) return;

    try {
      const { error } = await supabase
        .from('alumni_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      
      setCommentsMap(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(c => c.id !== commentId)
      }));
    } catch (err: any) {
      alert(`❌ Failed to delete reply: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
      
      {/* Category Selection Tabs */}
      <div 
        style={{ 
          display: 'flex', 
          borderBottom: '2px solid rgba(0,0,0,0.06)', 
          overflowX: 'auto',
          gap: '1rem',
          paddingBottom: '0.2rem'
        }}
      >
        {[
          { id: 'general', label: '💬 General Lounge' },
          { id: 'arabic', label: '📖 Arabic & Literature' },
          { id: 'career', label: '💼 Career & Mentorship' },
          { id: 'meetups', label: '📍 Meetups & Events' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id as CategoryType)}
            style={{
              padding: '0.6rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeCategory === cat.id ? '3px solid var(--primary-dark)' : '3px solid transparent',
              color: activeCategory === cat.id ? 'var(--primary-dark)' : 'var(--text-muted)',
              fontWeight: activeCategory === cat.id ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'border-color 0.2s, color 0.2s'
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* New Post Creator Form */}
      <div className="glass-card" style={{ padding: '1.2rem', border: '1px solid rgba(201, 156, 51, 0.15)' }}>
        <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <textarea
            placeholder={`Share an update, question, or resource in #${activeCategory}...`}
            value={postContent}
            onChange={e => setPostContent(e.target.value)}
            rows={3}
            maxLength={1000}
            required
            style={{
              width: '100%',
              padding: '0.8rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {1000 - postContent.length} characters remaining
            </span>
            <button
              type="submit"
              disabled={submittingPost || !postContent.trim()}
              style={{
                padding: '0.5rem 1.2rem',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--primary-dark)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                opacity: (!postContent.trim() || submittingPost) ? 0.6 : 1
              }}
            >
              {submittingPost ? 'Posting...' : 'Post Update'}
            </button>
          </div>
        </form>
      </div>

      {/* Posts List */}
      {loadingPosts && posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading posts...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No conversations here yet. Be the first to start the discussion!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {posts.map((post) => {
            const author = post.author || {};
            const isAuthor = post.author_id === currentUserId;
            const canDelete = isAuthor || isStaffOrAdmin;
            const isLiked = post.alumni_post_likes?.some((like: any) => like.user_id === currentUserId);
            
            return (
              <div 
                key={post.id} 
                className="glass-card" 
                style={{ 
                  padding: '1.2rem', 
                  border: '1px solid rgba(201, 156, 51, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.8rem'
                }}
              >
                {/* Header: Author info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <div 
                      style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        background: 'rgba(201, 156, 51, 0.1)', 
                        color: 'var(--primary-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.9rem'
                      }}
                    >
                      {author.name ? author.name[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-color)' }}>
                        {author.name || 'Anonymous User'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {author.courses?.name ? `${author.courses.name} • Batch ${author.batch_number}` : 'Academy Staff'} • {new Date(post.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.2rem'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* Content */}
                <div style={{ fontSize: '0.86rem', color: 'var(--text-color)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  {post.content}
                </div>

                {/* Actions Row */}
                <div style={{ display: 'flex', gap: '1.2rem', borderTop: '1px solid rgba(0,0,0,0.03)', paddingTop: '0.6rem', alignItems: 'center' }}>
                  {/* Like Button */}
                  <button
                    onClick={() => handleLikeToggle(post)}
                    style={{
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      color: isLiked ? '#ef4444' : 'var(--text-muted)',
                      fontSize: '0.78rem',
                      fontWeight: 650,
                      cursor: 'pointer',
                      padding: '0.2rem'
                    }}
                  >
                    <Heart size={15} fill={isLiked ? '#ef4444' : 'none'} />
                    <span>{post.likes_count} Likes</span>
                  </button>

                  {/* Comment Button */}
                  <button
                    onClick={() => toggleComments(post.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      color: expandedComments[post.id] ? 'var(--primary-dark)' : 'var(--text-muted)',
                      fontSize: '0.78rem',
                      fontWeight: 650,
                      cursor: 'pointer',
                      padding: '0.2rem'
                    }}
                  >
                    <MessageSquare size={15} />
                    <span>Replies</span>
                  </button>
                </div>

                {/* Expanded Comments Section */}
                {expandedComments[post.id] && (
                  <div style={{ marginTop: '0.4rem', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {loadingComments[post.id] ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>Loading replies...</div>
                    ) : (
                      <>
                        {/* List comments */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {(commentsMap[post.id] || []).length === 0 ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                              No replies yet. Start the conversation!
                            </div>
                          ) : (
                            (commentsMap[post.id] || []).map(comment => {
                              const commentAuthor = comment.author || {};
                              const canDeleteComment = comment.author_id === currentUserId || isStaffOrAdmin;
                              
                              return (
                                <div 
                                  key={comment.id} 
                                  style={{ 
                                    background: 'rgba(0,0,0,0.01)', 
                                    padding: '0.6rem 0.8rem', 
                                    borderRadius: '8px', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    gap: '0.2rem' 
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-color)' }}>
                                      {commentAuthor.name || 'Anonymous User'} 
                                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.4rem' }}>
                                        {commentAuthor.courses?.name ? `(Batch ${commentAuthor.batch_number})` : '(Staff)'}
                                      </span>
                                    </span>

                                    {canDeleteComment && (
                                      <button
                                        onClick={() => handleDeleteComment(post.id, comment.id)}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.1rem' }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-color)' }}>
                                    {comment.content}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Comment input form */}
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                          <input
                            type="text"
                            placeholder="Write a reply..."
                            value={commentInput[post.id] || ''}
                            onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleSendComment(post.id)}
                            style={{
                              flex: 1,
                              padding: '0.4rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.8rem'
                            }}
                          />
                          <button
                            onClick={() => handleSendComment(post.id)}
                            disabled={!(commentInput[post.id] || '').trim()}
                            style={{
                              padding: '0.4rem',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'var(--primary-dark)',
                              color: 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              opacity: !(commentInput[post.id] || '').trim() ? 0.6 : 1
                            }}
                          >
                            <Send size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
