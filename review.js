document.addEventListener("DOMContentLoaded", function () {
  const menuToggle = document.getElementById("menu-toggle");
  const navbar = document.querySelector(".navbar ul");
  const hamburgerIcon = document.getElementById("hamburger-icon");
  const closeIcon = document.getElementById("close-icon");

  menuToggle.addEventListener("click", () => {
    navbar.classList.toggle("active");
    hamburgerIcon.style.display = navbar.classList.contains("active") ? "none" : "inline";
    closeIcon.style.display = navbar.classList.contains("active") ? "inline" : "none";
  });

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
        img.src = 'assets/images/no profile.jpg';
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

  addReviewBtn.addEventListener('click', () => {
    const reviewText = reviewInput.value.trim();
    if (reviewText === '') return;

    const reviewHTML = `
      <div class="review-page">
        <div class="names">
          <img src="assets/images/thendo.enc" alt="Profile Picture" class="profile-picture">
          <h6>Thendo viens</h6>
        </div>
        <p>"${reviewText}"</p>
        <div class="review-actions">
          <div class="review">
            <button class="like-btn"><i class='bx bxs-like'></i>Like <span class="like-count">0</span></button>
            <button class="dislike-btn"><i class='bx bxs-dislike'></i>Dislike <span class="dislike-count">0</span></button>
            <button class="comment-btn"><i class='bx bx-comment'></i>Comment</button>
            <h2 class="commentsh2">Comments</h2>
            <div class="comments-area">
              <div class="comment-input" style="display:none;">
                <input type="text" placeholder="Write a comment..." />
                <button class="submit-comment">Submit</button>
              </div>
              <div class="comments-container"></div>
            </div>
          </div>
        </div>
      </div>
    `;

const temp = document.createElement('div');
temp.innerHTML = reviewHTML;
const newReviewPage = temp.firstElementChild;

const reviewWrapper = document.createElement('div');
reviewWrapper.className = 'review-page'; // Ensures correct width and styling
reviewWrapper.innerHTML = newReviewPage.innerHTML;

reviewGrid.insertBefore(reviewWrapper, addReviewContainer);
applyReviewLogic(reviewWrapper.querySelector('.review'));
  });
});
