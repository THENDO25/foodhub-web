// Handles review likes, dislikes, and comments.
document.addEventListener("DOMContentLoaded", function () {
  // === Reusable function to handle like/dislike/comment ===
  function applyReviewLogic(review) {
    const likeBtn = review.querySelector('.like-btn');
    const dislikeBtn = review.querySelector('.dislike-btn');
    const likeCountSpan = review.querySelector('.like-count');
    const dislikeCountSpan = review.querySelector('.dislike-count');
    const commentBtn = review.querySelector('.comment-btn');
    const commentInputDiv = review.querySelector('.comment-input');
    const commentInput = commentInputDiv.querySelector('input');
    const submitCommentBtn = commentInputDiv.querySelector('.submit-comment');
    const commentsContainer = review.querySelector('.comments-container');

    let likeCount = 0;
    let dislikeCount = 0;
    let liked = false;
    let disliked = false;

    likeBtn.addEventListener('click', () => {
      if (!liked) {
        likeCount++;
        liked = true;
        likeBtn.style.color = 'green';
        if (disliked) {
          dislikeCount--;
          disliked = false;
          dislikeBtn.style.color = '';
          dislikeCountSpan.innerText = dislikeCount;
        }
      } else {
        likeCount--;
        liked = false;
        likeBtn.style.color = '';
      }
      likeCountSpan.innerText = likeCount;
    });

    dislikeBtn.addEventListener('click', () => {
      if (!disliked) {
        dislikeCount++;
        disliked = true;
        dislikeBtn.style.color = 'red';
        if (liked) {
          likeCount--;
          liked = false;
          likeBtn.style.color = '';
          likeCountSpan.innerText = likeCount;
        }
      } else {
        dislikeCount--;
        disliked = false;
        dislikeBtn.style.color = '';
      }
      dislikeCountSpan.innerText = dislikeCount;
    });

    commentBtn.addEventListener('click', () => {
      commentInputDiv.style.display = commentInputDiv.style.display === 'none' ? 'block' : 'none';
      commentInput.focus();
    });

    submitCommentBtn.addEventListener('click', () => {
      const text = commentInput.value.trim();
      if (text !== "") {
        const commentBlock = document.createElement('div');
        commentBlock.className = 'comments-area';

        const namesDiv = document.createElement('div');
        namesDiv.className = 'names';

        const img = document.createElement('img');
        img.src = '../assets/images/no profile.jpg';
        img.alt = 'Profile Picture';
        img.className = 'profile-picture';

        const h6 = document.createElement('h6');
        h6.innerText = 'Unknown';

        namesDiv.appendChild(img);
        namesDiv.appendChild(h6);

        const commentText = document.createElement('p');
        commentText.className = 'comment-p';
        commentText.innerText = text;

        commentBlock.appendChild(namesDiv);
        commentBlock.appendChild(commentText);

        commentsContainer.appendChild(commentBlock);

        commentInput.value = "";
      }
    });
  }

  // Apply to all existing reviews
  document.querySelectorAll('.review').forEach(applyReviewLogic);

  // === Add New Review ===
  const addReviewBtn = document.querySelector('.AddReview button');
  const reviewInput = document.querySelector('.AddReview input');
  const reviewGrid = document.querySelector('.review-grid');
  const addReviewContainer = document.querySelector('.AddReview').parentElement;

  function buildReviewNode(reviewerName, reviewText) {
    const wrapper = document.createElement('div');
    wrapper.className = 'review-page';
    const names = document.createElement('div');
    names.className = 'names';
    const image = document.createElement('img');
    image.src = '../assets/images/thendo.enc';
    image.alt = 'Profile Picture';
    image.className = 'profile-picture';
    const name = document.createElement('h6');
    name.textContent = reviewerName || 'Customer';
    names.append(image, name);

    const quote = document.createElement('p');
    quote.textContent = `"${reviewText}"`;
    const actions = document.createElement('div');
    actions.className = 'review-actions';
    const review = document.createElement('div');
    review.className = 'review';
    const like = document.createElement('button');
    like.className = 'like-btn';
    like.type = 'button';
    const likeIcon = document.createElement('i');
    likeIcon.className = 'bx bxs-like';
    likeIcon.setAttribute('aria-hidden', 'true');
    const likeCount = document.createElement('span');
    likeCount.className = 'like-count';
    likeCount.textContent = '0';
    like.append(likeIcon, document.createTextNode('Like '), likeCount);
    const dislike = document.createElement('button');
    dislike.className = 'dislike-btn';
    dislike.type = 'button';
    const dislikeIcon = document.createElement('i');
    dislikeIcon.className = 'bx bxs-dislike';
    dislikeIcon.setAttribute('aria-hidden', 'true');
    const dislikeCount = document.createElement('span');
    dislikeCount.className = 'dislike-count';
    dislikeCount.textContent = '0';
    dislike.append(dislikeIcon, document.createTextNode('Dislike '), dislikeCount);
    const comment = document.createElement('button');
    comment.className = 'comment-btn';
    comment.type = 'button';
    const commentIcon = document.createElement('i');
    commentIcon.className = 'bx bx-comment';
    commentIcon.setAttribute('aria-hidden', 'true');
    comment.append(commentIcon, document.createTextNode('Comment'));
    const heading = document.createElement('h2');
    heading.className = 'commentsh2';
    heading.textContent = 'Comments';
    const commentsArea = document.createElement('div');
    commentsArea.className = 'comments-area';
    const inputArea = document.createElement('div');
    inputArea.className = 'comment-input';
    inputArea.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 500;
    input.placeholder = 'Write a comment...';
    const submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'submit-comment';
    submit.textContent = 'Submit';
    inputArea.append(input, submit);
    const comments = document.createElement('div');
    comments.className = 'comments-container';
    commentsArea.append(inputArea, comments);
    review.append(like, dislike, comment, heading, commentsArea);
    actions.appendChild(review);
    wrapper.append(names, quote, actions);
    return wrapper;
  }

  // Load persisted reviews safely after a refresh. Each saved field is assigned
  // through textContent by buildReviewNode, so stored markup remains inert text.
  async function loadSavedReviews() {
    try {
      const result = await window.foodHubApi.get('/api/reviews');
      (result.reviews || []).slice().reverse().forEach(saved => {
        const savedId = String(saved.id || '');
        if (savedId && Array.from(reviewGrid.querySelectorAll('[data-review-id]')).some(node => node.dataset.reviewId === savedId)) return;
        const node = buildReviewNode(saved.name || 'Customer', saved.text || '');
        node.dataset.reviewId = String(saved.id || '');
        reviewGrid.insertBefore(node, addReviewContainer);
        applyReviewLogic(node.querySelector('.review'));
      });
    } catch (err) {
      console.warn('Saved reviews could not be loaded.', err);
    }
  }
  loadSavedReviews();

  // Store review text as text. It is never parsed as HTML on the client.
  addReviewBtn.addEventListener('click', async () => {
    const reviewText = reviewInput.value.trim();
    if (reviewText === '') return;
    if (reviewText.length > 1000) { alert('Reviews must be 1000 characters or fewer.'); return; }

    addReviewBtn.disabled = true;
    try {
      const result = await window.foodHubApi.post('/api/reviews', { text: reviewText });
      const saved = result.review || {};
      const reviewWrapper = buildReviewNode(saved.name || 'Customer', saved.text || reviewText);
      if (saved.id) reviewWrapper.dataset.reviewId = String(saved.id);
      reviewGrid.insertBefore(reviewWrapper, addReviewContainer);
      applyReviewLogic(reviewWrapper.querySelector('.review'));
      reviewInput.value = '';
    } catch (err) {
      alert(err.message || 'Could not post your review.');
    } finally {
      addReviewBtn.disabled = false;
    }
  });
});
