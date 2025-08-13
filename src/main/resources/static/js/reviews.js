const REVIEW_API = 'https://trip-advisor-3.onrender.com/api/review';

const reviews = {
    async loadReviews() {
        try {
            console.log('Loading reviews...');
            const currentUser = auth?.getCurrentUser();
            const token = auth?.getToken();

            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await auth.request(REVIEW_API, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'username': currentUser?.userName || ''
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error:', errorText);
                throw new Error(`Failed to load Reviews: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            this.displayReviews(data.data);
        } catch (error) {
            console.error('Error loading reviews:', error);
            this.displayError(`Failed to load reviews: ${error.message}`);
        }
    },

    async submitReview(reviewData) {
        try {
            console.log('Submitting review:', reviewData);
            const currentUser = auth?.getCurrentUser();
            const token = auth?.getToken();

            if (!token) throw new Error('No authentication token found');

            const response = await auth.request(REVIEW_API, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'username': currentUser?.userName || ''
                },
                body: JSON.stringify(reviewData)
            });

            const data = await response.json();
            if (!response.ok) {
                console.error('Submit error response:', data);
                throw new Error(`Error while submitting review: ${response.status} ${response.statusText}`);
            }

            this.showSuccess('Review saved successfully');

            const reviewForm = document.getElementById('reviewForm');
            const ratingInput = document.getElementById('rating');
            if (reviewForm) reviewForm.reset();
            if (ratingInput) ratingInput.value = '0';
            this.updateStarRating(0);

            this.loadReviews();
            return data;
        } catch (error) {
            console.error('Error submitting review:', error);
            throw error;
        }
    },

    displayReviews(reviewsData) {
        const reviewsList = document.getElementById('reviewsList');
        if (!reviewsList) return;

        if (!reviewsData || reviewsData.length === 0) {
            reviewsList.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-star fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No reviews yet</h5>
                    <p class="text-muted">Be the first to share your travel experience!</p>
                </div>
            `;
            return;
        }

        const reviewsHTML = reviewsData.map(review => `
            <div class="card review-card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="card-title mb-1">${review.title || 'Travel Review'}</h5>
                            <h6 class="card-subtitle text-muted">
                                <i class="fas fa-map-marker-alt me-1"></i>
                                ${review.destination || 'Unknown'}
                            </h6>
                        </div>
                        <div class="rating-stars">
                            ${this.generateStars(review.rating || 0)}
                        </div>
                    </div>
                    <p class="card-text">${review.comment || review.review || ''}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-user me-1"></i>
                            ${review.reviewerName || review.userName || 'Anonymous'}
                        </small>
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>
                            ${this.formatDate(review.createdAt || review.date)}
                        </small>
                    </div>
                </div>
            </div>
        `).join('');

        reviewsList.innerHTML = reviewsHTML;
    },

    displayError(message) {
        const reviewsList = document.getElementById('reviewsList');
        if (!reviewsList) return;

        reviewsList.innerHTML = `
            <div class="alert alert-danger text-center">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${message}
                <button class="btn btn-link btn-sm ms-2" onclick="reviews.loadReviews()">
                    <i class="fas fa-redo me-1"></i>Try Again
                </button>
            </div>
        `;
    },

    showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 1055; min-width: 300px;';
        alert.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);
        setTimeout(() => {
            if (alert.parentNode) alert.remove();
        }, 3000);
    },

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let starsHTML = '';

        for (let i = 0; i < fullStars; i++) starsHTML += '<i class="fas fa-star"></i>';
        if (hasHalfStar) starsHTML += '<i class="fas fa-star-half-alt"></i>';
        for (let i = 0; i < 5 - Math.ceil(rating); i++) starsHTML += '<i class="far fa-star"></i>';

        return starsHTML;
    },

    formatDate(dateString) {
        if (!dateString) return 'Unknown Date';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch {
            return 'Unknown Date';
        }
    },

    updateStarRating(rating) {
        const stars = document.querySelectorAll('.star-rating .star');
        stars.forEach((star, index) => {
            star.classList.toggle('active', index < rating);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (!auth?.isAuthenticated()) {
        window.location.href = 'https://trip-advisor-3.onrender.com/html/signin.html';
        return;
    }

    const currentUser = auth.getCurrentUser();
    const userInfoElement = document.getElementById('userInfo');
    if (currentUser && userInfoElement) {
        userInfoElement.textContent = `Welcome, ${currentUser.firstName || currentUser.userName}`;
    }

    reviews.loadReviews();

    // Star rating click & hover
    const stars = document.querySelectorAll('.star-rating .star');
    const ratingInput = document.getElementById('rating');
    if (stars.length > 0 && ratingInput) {
        stars.forEach(star => {
            const rating = parseInt(star.getAttribute('data-rating'));
            star.addEventListener('click', () => {
                ratingInput.value = rating;
                reviews.updateStarRating(rating);
            });
            star.addEventListener('mouseover', () => reviews.updateStarRating(rating));
        });

        const starRatingElement = document.getElementById('starRating');
        if (starRatingElement) {
            starRatingElement.addEventListener('mouseleave', () => {
                const currentRating = parseInt(ratingInput.value) || 0;
                reviews.updateStarRating(currentRating);
            });
        }
    }

    // Review form submission
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const rating = parseInt(document.getElementById('rating')?.value || '0');

            if (rating === 0) {
                alert('Please select rating');
                return;
            }

            const reviewData = {
                destination: formData.get('destination') || document.getElementById('destination')?.value || '',
                title: formData.get('title') || document.getElementById('title')?.value || '',
                comment: formData.get('comment') || document.getElementById('comment')?.value || '',
                rating: rating
            };

            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                const originalText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Submitting...';

                try {
                    await reviews.submitReview(reviewData);
                } catch {
                    alert('Failed to submit review');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            }
        });
    }
});

window.reviews = reviews;
