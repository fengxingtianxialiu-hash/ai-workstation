import { ref } from 'vue';

const visible = ref(false);
const message = ref('');
const type = ref<'success' | 'error' | 'info'>('info');

let timer: any = null;

export function showToast(msg: string, toastType: 'success' | 'error' | 'info' = 'info') {
  message.value = msg;
  type.value = toastType;
  visible.value = true;

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    visible.value = false;
  }, 2000);
}

export function showModal(title: string, content: string): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">${title}</span>
        </div>
        <div class="modal-body">
          <p>${content}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel">取消</button>
          <button class="btn btn-primary" id="modal-confirm">确认</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    const cleanup = () => document.body.removeChild(dialog);

    dialog.querySelector('#modal-cancel')?.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    dialog.querySelector('#modal-confirm')?.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        cleanup();
        resolve(false);
      }
    });
  });
}

export { visible, message, type };
