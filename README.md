# Swedish trains fixed (by Hannes)

Based upon/forked from https://github.com/Brickblock1/Swedish-trains-fix

Requires you to have "Swedish trains by AI" NewGRF installed and loaded before this, as it patches that.
Since this is a fork of the "Swedish trains fix", it replaces that, so no need to have both this and that.

What does this add/change from the OG Swedish train fix? Well, in this alternate universe the X2000 train production actually continued, so...
* All X2 including the OG now has tilting train functionality (yay!)
* X2 and UB2, UB2X available in 1986 (they were ordered by SJ this year, and in-game it's better balanced in comparison to the other trains)
* In 1993 they put two engines and broke a speed record of 276km/h (this actually happend!), in this game we celebrate that success by releasing a 242 km/h X2 G2 variant. This is based on real-life discussions in approx 2002 on raising the allowed speed for existing X2 trains to 220km/h. According to Swedish rules they should be able to do +10% if breaking etc allows it, ie a top speed of 242km/h. It's also got some improved engines, approx 10% better than the original.
* In 1999, the prototype from 1993 is actually productionized as a dual-headed X2000, which means we get a top speed of 276km/h, but we loose the end cab of course. It has a little more power than two of the original ones because of engine improvements. It gets the new all-grey livery instead of the blue line.
* The X2000 gains popularity and is a great export train, and USA orders this for their Amtrak since they want tilting trains. Because of this, there is a new UB2 Cargo variant developed, with support for Mail, Goods and Valuables. It also has tilting train functionality, to make sure your cakes don't smash the inner walls of the cargo cabs when they're transported at 276km/h. 

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
3. Use palettize.js like `node palettize.js -p <palette to copy over> -i <input file> -o <output file with corrected palette>` ie `node palettize.js -p palette_key.png -i "x2_grey.png" -o out.png`

You can also use glob and stuff, like this:
```
node palettize.js -p palette_key.png -i "src-img/*.png" -o gfx/
```

## How to build and compile and stuff
1. Have mlmc
2. Have patience (not in time but with stuff that doesn't work as expected)
```
nmlc -c \
     --grf swedish_trains_fixed_chw_v2.grf \
     trainfix.nml
```

On macOS you can then copy it to your openttd folder:
```
cp swedish_trains_fixed_chw_v2.grf ~/Documents/OpenTTD/content_download/newgrf
```
