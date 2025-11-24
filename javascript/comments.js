// Comment system for recipe pages
class CommentManager {
    constructor(recipeId) {
        this.recipeId = recipeId;
        this.comments = this.loadComments();
        this.init();
    }

    init() {
        this.renderComments();
        this.setupEventListeners();
        
        // Listen for auth state changes
        window.addEventListener('userLoggedIn', () => this.renderComments());
        window.addEventListener('userLoggedOut', () => this.renderComments());
    }

    loadComments() {
        const stored = localStorage.getItem(`comments_${this.recipeId}`);
        return stored ? JSON.parse(stored) : [];
    }

    saveComments() {
        localStorage.setItem(`comments_${this.recipeId}`, JSON.stringify(this.comments));
    }

    addComment(text, parentId = null) {
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            alert('Please sign in to post a comment.');
            return;
        }

        const user = window.authManager.getUser();
        const comment = {
            id: Date.now().toString(),
            userId: user.id,
            userName: user.name,
            userPicture: user.picture,
            text: text.trim(),
            parentId: parentId,
            timestamp: new Date().toISOString(),
            replies: []
        };

        if (parentId) {
            const parent = this.findComment(parentId);
            if (parent) {
                parent.replies.push(comment);
            }
        } else {
            this.comments.push(comment);
        }

        this.saveComments();
        this.renderComments();
    }

    findComment(id) {
        for (const comment of this.comments) {
            if (comment.id === id) return comment;
            const found = comment.replies.find(r => r.id === id);
            if (found) return found;
        }
        return null;
    }

    deleteComment(id) {
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            return;
        }

        const user = window.authManager.getUser();
        
        // Remove from top-level comments
        const index = this.comments.findIndex(c => c.id === id);
        if (index !== -1) {
            if (this.comments[index].userId === user.id) {
                this.comments.splice(index, 1);
                this.saveComments();
                this.renderComments();
            }
            return;
        }

        // Remove from replies
        for (const comment of this.comments) {
            const replyIndex = comment.replies.findIndex(r => r.id === id);
            if (replyIndex !== -1 && comment.replies[replyIndex].userId === user.id) {
                comment.replies.splice(replyIndex, 1);
                this.saveComments();
                this.renderComments();
                return;
            }
        }
    }

    setupEventListeners() {
        const form = document.getElementById('comment-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const textarea = form.querySelector('textarea');
                if (textarea && textarea.value.trim()) {
                    this.addComment(textarea.value);
                    textarea.value = '';
                }
            });
        }
    }

    renderComments() {
        const container = document.getElementById('comments-container');
        if (!container) return;

        const isAuthenticated = window.authManager && window.authManager.isAuthenticated();

        container.innerHTML = `
            <div class="comments-section">
                <h3 class="comments-title">Comments</h3>
                
                ${isAuthenticated ? `
                    <form id="comment-form" class="comment-form">
                        <textarea 
                            id="comment-text" 
                            placeholder="Write a comment..." 
                            rows="4" 
                            required
                        ></textarea>
                        <button type="submit" class="submit-comment-btn">Post Comment</button>
                    </form>
                ` : `
                    <div class="login-prompt">
                        <p>Please <a href="#" id="login-link">sign in</a> to post comments.</p>
                    </div>
                `}
                
                <div class="comments-list" id="comments-list">
                    ${this.comments.length === 0 ? 
                        '<p class="no-comments">No comments yet. Be the first to comment!</p>' : 
                        this.comments.map(comment => this.renderComment(comment)).join('')
                    }
                </div>
            </div>
        `;

        // Re-setup form listener
        this.setupEventListeners();

        // Setup reply and delete listeners
        this.setupCommentListeners();

        // Setup login link
        const loginLink = document.getElementById('login-link');
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('auth-container')?.scrollIntoView({ behavior: 'smooth' });
            });
        }
    }

    renderComment(comment, isReply = false) {
        const isAuthenticated = window.authManager && window.authManager.isAuthenticated();
        const user = window.authManager?.getUser();
        const canDelete = isAuthenticated && user && user.id === comment.userId;

        return `
            <div class="comment ${isReply ? 'comment-reply' : ''}" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <img src="${comment.userPicture}" alt="${comment.userName}" class="comment-avatar">
                    <div class="comment-author">
                        <strong>${comment.userName}</strong>
                        <span class="comment-time">${this.formatTime(comment.timestamp)}</span>
                    </div>
                    ${canDelete ? `
                        <button class="delete-comment-btn" data-comment-id="${comment.id}" title="Delete comment">
                            ×
                        </button>
                    ` : ''}
                </div>
                <div class="comment-body">
                    <p>${this.escapeHtml(comment.text)}</p>
                </div>
                ${isAuthenticated && !isReply ? `
                    <button class="reply-btn" data-comment-id="${comment.id}">Reply</button>
                ` : ''}
                ${comment.replies && comment.replies.length > 0 ? `
                    <div class="replies">
                        ${comment.replies.map(reply => this.renderComment(reply, true)).join('')}
                    </div>
                ` : ''}
                ${isAuthenticated && !isReply ? `
                    <form class="reply-form" id="reply-form-${comment.id}" style="display: none;">
                        <textarea placeholder="Write a reply..." rows="3" required></textarea>
                        <div class="reply-form-actions">
                            <button type="submit" class="submit-reply-btn">Post Reply</button>
                            <button type="button" class="cancel-reply-btn" data-comment-id="${comment.id}">Cancel</button>
                        </div>
                    </form>
                ` : ''}
            </div>
        `;
    }

    setupCommentListeners() {
        // Reply buttons
        document.querySelectorAll('.reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.getAttribute('data-comment-id');
                const form = document.getElementById(`reply-form-${commentId}`);
                if (form) {
                    form.style.display = form.style.display === 'none' ? 'block' : 'none';
                }
            });
        });

        // Cancel reply buttons
        document.querySelectorAll('.cancel-reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.getAttribute('data-comment-id');
                const form = document.getElementById(`reply-form-${commentId}`);
                if (form) {
                    form.style.display = 'none';
                    form.querySelector('textarea').value = '';
                }
            });
        });

        // Reply forms
        document.querySelectorAll('.reply-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const commentId = form.id.replace('reply-form-', '');
                const textarea = form.querySelector('textarea');
                if (textarea && textarea.value.trim()) {
                    this.addComment(textarea.value, commentId);
                    textarea.value = '';
                    form.style.display = 'none';
                }
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-comment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (confirm('Are you sure you want to delete this comment?')) {
                    const commentId = e.target.getAttribute('data-comment-id');
                    this.deleteComment(commentId);
                }
            });
        });
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize comment manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const recipeId = window.location.pathname.split('/').pop().replace('.html', '') || 'default';
    window.commentManager = new CommentManager(recipeId);
});

