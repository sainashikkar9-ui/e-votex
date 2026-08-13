/* indexProt.html / index.ejs script */
    const buttons = document.querySelectorAll('.vote-button');
    const status = document.getElementById('ballot-status');

    function showSelectedVote(voteName) {
      const selectedButton = document.querySelector(`[data-vote="${voteName}"]`);
      const selectedLed = document.getElementById(selectedButton.dataset.led);
      selectedLed.className = 'h-4 w-4 rounded-full border-2 border-emerald-800 bg-emerald-500 shadow-[0_0_12px_rgba(34,197,94,.9),inset_0_1px_2px_rgba(0,0,0,.35)]';
      buttons.forEach((button) => { button.disabled = true; button.classList.add('cursor-not-allowed', 'opacity-60'); });
      status.textContent = 'Vote recorded on this device. Thank you for participating.';
    }

    buttons.forEach((button) => button.addEventListener('click', () => {
      if (button.disabled) return;
      showSelectedVote(button.dataset.vote);
    }));
