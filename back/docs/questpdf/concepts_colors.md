# Concepts Colors

QuestPDF supports multiple color formats.

```c#
using QuestPDF.Helpers;

container
    .Padding(20)
    .Border(1)
    .BorderColor("#03A9F4")
    .Background(Colors.LightBlue.Lighten5)
    .Padding(20)
    .Text("Blue text")
    .Bold()
    .FontColor(Colors.LightBlue.Darken4)
    .Underline()
    .DecorationWavy()
    .DecorationColor(0xFF0000);
```

![example](/patterns-and-practices/colors.webp)

## Color definitions

### HEX Colors

A hexadecimal color is specified with: `#RRGGBB`, where the RR (red), GG (green) and BB (blue) hexadecimal integers specify the components of the color. All values range from 00 to FF, and are case-insensitive.

### Alpha channel

To specify an alpha channel, add two more hexadecimal digits in front of the color code: `#AARRGGBB` where AA is the alpha channel. The alpha channel defines the transparency of a color and ranges from 00 (fully transparent) to FF (fully opaque).

### Shorthand HEX

You can use shorthand HEX codes with 3 or 4 digits. The library will automatically expand them to the full 6 or 8-digit format. For example, `#123` will be expanded to `#112233` and `#89AB` to `#8899AABB`.

You can also omit the hash sign (`#`) at the beginning of the color code.

> **WARNING:** Please be aware that in some software the alpha channel is specified at the end of the color code, e.g. `#RRGGBBAA`.

## Examples
#FF0000#0000FF#3CB371#EE82EE#FFA500#6A5ACD
## Material Design colors

For your convenience, QuestPDF provides a list of colors from the Google Material Design palette.

| Variant | Recommended Use |
| --- | --- |
| Medium Shade (Base) | Base color for the palette |
| Lighter Shades | Large background areas or surfaces |
| Darker Shades | Text, headlines, or elements requiring higher contrast against a lighter background |
| Accent Swatches | Small elements where user attention is needed |
Red.Lighten5Red.Lighten4Red.Lighten3Red.Lighten2Red.Lighten1Red.MediumRed.Darken1Red.Darken2Red.Darken3Red.Darken4Red.Accent1Red.Accent2Red.Accent3Red.Accent4Pink.Lighten5Pink.Lighten4Pink.Lighten3Pink.Lighten2Pink.Lighten1Pink.MediumPink.Darken1Pink.Darken2Pink.Darken3Pink.Darken4Pink.Accent1Pink.Accent2Pink.Accent3Pink.Accent4Purple.Lighten5Purple.Lighten4Purple.Lighten3Purple.Lighten2Purple.Lighten1Purple.MediumPurple.Darken1Purple.Darken2Purple.Darken3Purple.Darken4Purple.Accent1Purple.Accent2Purple.Accent3Purple.Accent4DeepPurple.Lighten5DeepPurple.Lighten4DeepPurple.Lighten3DeepPurple.Lighten2DeepPurple.Lighten1DeepPurple.MediumDeepPurple.Darken1DeepPurple.Darken2DeepPurple.Darken3DeepPurple.Darken4DeepPurple.Accent1DeepPurple.Accent2DeepPurple.Accent3DeepPurple.Accent4Indigo.Lighten5Indigo.Lighten4Indigo.Lighten3Indigo.Lighten2Indigo.Lighten1Indigo.MediumIndigo.Darken1Indigo.Darken2Indigo.Darken3Indigo.Darken4Indigo.Accent1Indigo.Accent2Indigo.Accent3Indigo.Accent4Blue.Lighten5Blue.Lighten4Blue.Lighten3Blue.Lighten2Blue.Lighten1Blue.MediumBlue.Darken1Blue.Darken2Blue.Darken3Blue.Darken4Blue.Accent1Blue.Accent2Blue.Accent3Blue.Accent4LightBlue.Lighten5LightBlue.Lighten4LightBlue.Lighten3LightBlue.Lighten2LightBlue.Lighten1LightBlue.MediumLightBlue.Darken1LightBlue.Darken2LightBlue.Darken3LightBlue.Darken4LightBlue.Accent1LightBlue.Accent2LightBlue.Accent3LightBlue.Accent4Cyan.Lighten5Cyan.Lighten4Cyan.Lighten3Cyan.Lighten2Cyan.Lighten1Cyan.MediumCyan.Darken1Cyan.Darken2Cyan.Darken3Cyan.Darken4Cyan.Accent1Cyan.Accent2Cyan.Accent3Cyan.Accent4Teal.Lighten5Teal.Lighten4Teal.Lighten3Teal.Lighten2Teal.Lighten1Teal.MediumTeal.Darken1Teal.Darken2Teal.Darken3Teal.Darken4Teal.Accent1Teal.Accent2Teal.Accent3Teal.Accent4Green.Lighten5Green.Lighten4Green.Lighten3Green.Lighten2Green.Lighten1Green.MediumGreen.Darken1Green.Darken2Green.Darken3Green.Darken4Green.Accent1Green.Accent2Green.Accent3Green.Accent4LightGreen.Lighten5LightGreen.Lighten4LightGreen.Lighten3LightGreen.Lighten2LightGreen.Lighten1LightGreen.MediumLightGreen.Darken1LightGreen.Darken2LightGreen.Darken3LightGreen.Darken4LightGreen.Accent1LightGreen.Accent2LightGreen.Accent3LightGreen.Accent4Lime.Lighten5Lime.Lighten4Lime.Lighten3Lime.Lighten2Lime.Lighten1Lime.MediumLime.Darken1Lime.Darken2Lime.Darken3Lime.Darken4Lime.Accent1Lime.Accent2Lime.Accent3Lime.Accent4Yellow.Lighten5Yellow.Lighten4Yellow.Lighten3Yellow.Lighten2Yellow.Lighten1Yellow.MediumYellow.Darken1Yellow.Darken2Yellow.Darken3Yellow.Darken4Yellow.Accent1Yellow.Accent2Yellow.Accent3Yellow.Accent4Amber.Lighten5Amber.Lighten4Amber.Lighten3Amber.Lighten2Amber.Lighten1Amber.MediumAmber.Darken1Amber.Darken2Amber.Darken3Amber.Darken4Amber.Accent1Amber.Accent2Amber.Accent3Amber.Accent4Orange.Lighten5Orange.Lighten4Orange.Lighten3Orange.Lighten2Orange.Lighten1Orange.MediumOrange.Darken1Orange.Darken2Orange.Darken3Orange.Darken4Orange.Accent1Orange.Accent2Orange.Accent3Orange.Accent4DeepOrange.Lighten5DeepOrange.Lighten4DeepOrange.Lighten3DeepOrange.Lighten2DeepOrange.Lighten1DeepOrange.MediumDeepOrange.Darken1DeepOrange.Darken2DeepOrange.Darken3DeepOrange.Darken4DeepOrange.Accent1DeepOrange.Accent2DeepOrange.Accent3DeepOrange.Accent4Brown.Lighten5Brown.Lighten4Brown.Lighten3Brown.Lighten2Brown.Lighten1Brown.MediumBrown.Darken1Brown.Darken2Brown.Darken3Brown.Darken4Grey.Lighten5Grey.Lighten4Grey.Lighten3Grey.Lighten2Grey.Lighten1Grey.MediumGrey.Darken1Grey.Darken2Grey.Darken3Grey.Darken4BlueGrey.Lighten5BlueGrey.Lighten4BlueGrey.Lighten3BlueGrey.Lighten2BlueGrey.Lighten1BlueGrey.MediumBlueGrey.Darken1BlueGrey.Darken2BlueGrey.Darken3BlueGrey.Darken4