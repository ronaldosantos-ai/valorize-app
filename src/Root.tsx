import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import App from '../App';

// Na web: limita a largura ao tamanho de um celular, centraliza no desktop
// e esconde a barra de rolagem (a rolagem continua funcionando).
export default function Root() {
  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const style = document.createElement('style');
    style.innerHTML =
      'html, body { background: #101E36; } ' +
      '* { scrollbar-width: none; -ms-overflow-style: none; } ' +
      '*::-webkit-scrollbar { display: none; }';
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  if (Platform.OS !== 'web') return <App />;
  return (
    <View style={{ flex: 1, backgroundColor: '#101E36', alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 480, overflow: 'hidden' }}>
        <App />
      </View>
    </View>
  );
}
