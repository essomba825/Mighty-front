"""Génère les icônes PWA depuis le logo existant.

Le logo source n'est pas carré (760x645) et pèse 500 Ko : on ne peut pas le
servir tel quel dans un manifeste, où le navigateur redimensionne et rogne. On
compose donc des icônes carrés sur fond marine, avec une marge pour l'icône
« maskable » (Android applique une masque qui peut rogner jusqu'à 20 %).
"""
from PIL import Image
from pathlib import Path

PUBLIC = Path(__file__).resolve().parent
MARINE = (16, 30, 60)
OR = (201, 162, 39)


def charger_marge(dossier):
    img = Image.open(PUBLIC / 'logo-mark.png').convert('RGBA')
    # Le logo a un fond transparent : on le recolore en or pour qu'il contraste
    # sur le bleu marine, sinon il disparait dans le fond.
    pixels = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]
            if a > 0:
                pixels[x, y] = (OR[0], OR[1], OR[2], a)
    img.thumbnail((dossier, dossier), Image.LANCZOS)
    return img


def composer(taille, marge, rayon, fichier):
    fond = Image.new('RGB', (taille, taille), MARINE)
    masque = Image.new('L', (taille, taille), 0)
    from PIL import ImageDraw
    d = ImageDraw.Draw(masque)
    d.rounded_rectangle([0, 0, taille - 1, taille - 1], radius=rayon, fill=255)
    fond.paste(fond, (0, 0), masque)

    logo = charger_marge(int(taille * (1 - 2 * marge)))
    x = (taille - logo.width) // 2
    y = (taille - logo.height) // 2
    if rayon:
        calque = Image.new('L', (taille, taille), 0)
        ImageDraw.Draw(calque).rounded_rectangle([0, 0, taille - 1, taille - 1], radius=rayon, fill=255)
        logo = logo.copy()
        logo.putalpha(Image.composite(logo.getchannel('A'), Image.new('L', logo.size, 0), logo.getchannel('A')))
    fond.paste(logo, (x, y), logo)
    fond.save(PUBLIC / fichier, 'PNG', optimize=True)
    ko = (PUBLIC / fichier).stat().st_size / 1024
    print(f'{fichier:28} {taille}x{taille}  {ko:.0f} Ko')


composer(192, 0.16, 0, 'pwa-192.png')
composer(512, 0.16, 0, 'pwa-512.png')
composer(180, 0.14, 22, 'apple-touch-icon.png')
composer(512, 0.26, 0, 'pwa-maskable-512.png')
