# Swedish trains fixed (by Hannes)

Based upon/forked from https://github.com/Brickblock1/Swedish-trains-fix

## How to fix COLOR MAPS / Color Palette so nlmc will be happy

1. Make sure to keep at least one PNG with the original color map so you can keep it
2. Edit in whatever software you want (I use Pixelmator Pro)
3. Save it as a regular PNG (ie NOT indexed) in your editing software to avoid confusion in GIMP later and GIMP assigning the wrong colors etc, since if you save it as an indexed image in another software it will truncate the colormap ie colors will be in the wrong place.
4. Open the edited image in GIMP and an original image as well with the color map
5. In GIMP, in the original image with the correct palette, use Windows -> Dockable Dialogs -> Palettes and then save the palette as a custom palette
6. In GIMP, in the image you want to apply the palette to, choose Image -> Mode -> Indexed to make sure it gets an Indexed image. Then, when chosen which palette, make sure to pick the saved custom palette, and make sure to NOT use any "remove unused colors from palette" or likewise.
7. Export the image as automatic or 8bpp RGB and with saved color palette. Make sure not to use RGBA

## Use palettize.js to fix color maps
1. Use an OG image and edit in whatever editor you want such as Pixelmator Pro
2. Install nodejs packages with npm using `npm install`
3. Use palettize.js like `node palettize.js <palette to copy over> <input file> <output file with corrected palette>` ie `node palettize.js palette_key.png x2_grey_wrong.png out.png`