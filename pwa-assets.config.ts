import { defaultAssetName, defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Preset minimal-2023 a partir de static/favicon.svg. O gerador grava ao lado da imagem de
// origem e não tem opção de pasta de saída; o prefixo "icones/" no assetName (e no nome do
// favicon.ico) leva tudo para static/icones/.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, favicons: [[48, 'icones/favicon.ico']] },
    // fundo bege no lugar do branco padrão nas versões com margem (maskable e iOS)
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#cdc4b1' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#cdc4b1' } },
    assetName: (type, size) => `icones/${defaultAssetName(type, size)}`
  },
  images: ['static/favicon.svg']
});
