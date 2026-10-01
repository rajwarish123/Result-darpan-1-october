document.addEventListener('click', async (event) => {
  const button = event.target.closest('.chat-helpful');
  if (!button || button.disabled) return;
  const token = localStorage.getItem('preply-session-token');
  if (!token) {
    const notice = document.createElement('span');
    notice.className = 'chat-helpful-error';
    notice.textContent = 'Sign in or start a guest session to mark contributions as helpful.';
    button.after(notice);
    button.disabled = true;
    return;
  }

  button.disabled = true;
  try {
    const response = await fetch(`/api/chat/messages/${encodeURIComponent(button.dataset.messageId)}/helpful`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Your vote could not be saved.');
    button.classList.add('voted');
    button.textContent = `Helpful · ${payload.helpfulCount}`;
    window.dispatchEvent(new Event('community-vote-recorded'));
  } catch (error) {
    button.disabled = false;
    const notice = document.createElement('span');
    notice.className = 'chat-helpful-error';
    notice.textContent = error.message;
    button.after(notice);
  }
});