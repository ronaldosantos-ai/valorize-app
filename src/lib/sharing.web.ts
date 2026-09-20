type ShareOptions = { mimeType?: string; dialogTitle?: string };

export async function isAvailableAsync() {
  return true;
}

export async function shareAsync(uri: string, options?: ShareOptions) {
  const blob = await (await fetch(uri)).blob();
  const file = new File([blob], 'tabela-valorize.png', { type: 'image/png' });
  const nav: any = navigator;

  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: options?.dialogTitle });
      return;
    } catch (e: any) {
      if (e && e.name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tabela-valorize.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
