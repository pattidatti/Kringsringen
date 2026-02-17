import React from 'react';

type MedievalPanelProps = {
    className?: string;
    children?: React.ReactNode;
    style?: React.CSSProperties;
};

/**
 * A pixel-perfect 9-slice panel using individual 16x16 Base64 slices.
 * This guarantees NO BLEEDING from other sprites in the sheet.
 * Slices are taken from MediavelFree.png starting at y=16 (clean wood).
 */
export const MedievalPanel = ({ className = '', children, style }: MedievalPanelProps) => {

    // Clean Wood Slices (16x16 pixels each)
    const SLICES = {
        // Row y=16
        TL: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABHElEQVR4AeySQU7DQAxFn9p00B7GshI7XIC9O9yAkLhKXIQ7XAAX6AEQC9YstYvIskXTVFUT/3/S0Abajh/u5fX0/NmxI/mP/fP905g76mG+iCAsS0X1A5M/F+k/89j6X2fM6A6HIAQeE9VfKMo/E+l/f2T6i/5i/x61p7960P0N/hBAtA0V7YPk+r7V723fFvS/zzP6fX9m+D/7Zf9q96E/e9CHmC0V5Z8J6Xvz/f1S0P8+z+j3/Znh9++X/avdg/7mQaM9FdVvCeXvDf96UfF9n9Hv+zPD798v+1e7B/3Lg8ayVFQ/EPp9E/m7Prf+1xkzul8v/5P+f+mf/Yv9u9efPWi8pKJ6R+T7rvV3e279rzNm9HwY+j/p/5f+2b/Xv29pvwv+A5NfM3BAd0iHAAAAAElFTkSuQmCC',
        T: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABMElEQVR4AexSTOsDQRAdz7S0KiKb8v9E96IHEfSgaZfOFAmCqD/AnpS98GupPRQXGicTX6IKon7I8h+T0EzAtOmzbtzX98YfKE0H57MPZt/Oe7OzoPnYv69+fL9hXmZey58C2v7vS2yv5An/mS+j7OaT9lY+z72Xv6H91fVq9/z4Nf0LoLndN7uPz/Dvi7P7+CydpWvpaL6M0ptf2lv5PPdefIb2V7er3fPT1/RXgBZ88+PrA89rB7mNly1fS0XzZZTe/NLeitf0Zf6S9lS3q93T89X0N4Dms+D6vN4987yOsN94WvK5VDRfRunNL+2tfE1f5i9pT3W72j09X01fAZqNAs9r9eyV50Uv6TeelXwoFc2XUXrzS3srXtOX+UvaU92udk/PF9PXfALvA99v/I776QAAAABJRU5ErkJggg==',
        TR: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABNElEQVR4AexSwW0DQRBd57S0KiKb+n+iB1EHEfSg7ZTOlAgCiP8B9qRshV9L7aG46mTyK+onYglDlz8mozmBzOi7btzX98YfKE0K588fzp6d92Z7QfOxf88efL9iXuR+zZ8C2v7/S2yv5An/mS+jbOa9dkY+p69re3H93fVm9/j4Nf0FoLleNrsPz/Dvh7P76Cy9pYf0mB7S1/SYnq6mvwa04Jsfn594Wvto++3Tkr+kh/SQvqbH9HQ1fQU0nwXX5/X2medpC/XasOQv6SE9pK/pMT1dTV8BmrUCz7v27JXjWUt90yv5S3pID+lrekxPV9NXfALvA96P+oHz6Yf0ZOfLku+lovkySm9+aW/Fa/oyf0l7qtvV7un5avqaT+B94PuD1Y/67Xf0lG9L+Ut6SA/pa3pMT9fTXwGa/gN6P/I7yG8yOAAAAABJRU5ErkJggg==',

        // Row y=32 (Side edges and center)
        L: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABzklEQVR4AWSRy0rbURTGvzkxSksf6SNGW9vSpsUuulAlLURKpXvtpGInCCUugisXvYXFjd9NXPrcuBJx6SLgX6YI0YyPEPEpiVEhIkpM0qSZyWSayTz8RBDxEz3vOfPda845Z5S80V9fP6Bv7RzQN3ce0YffP6Gv7Tygf7t7SB7uH5NHB49IGv1fBvN/G36mRMT/R6A0R3v3eZfU7XFjzO6Cbeo0rE43rA4XxuxDqKltA6p6oWp0I67pWInEYLeYpRX/mYpUAnA0mC/C0TAsZjP6BgdR3/AAnM6AdRqC062geYjSng8Xo787A8N9o7A7XRhv64Xyvofh8SkYre5fRkFfVwbX5800vP0Anu+f8fDxS97/9uP8oA83x13y4mEHN6dtXJ+38Z26OunAr/Iunr76eP7VjPPDTtye9uLpqxeP37vwnbr66MQfL0p7PtyML0O23Rlg7U2zTjfg08wEni8z8O2qCbdnfXvH29O+A603zZ0O88XF5QW8eG5PHz+As2Of7O/WfH1Wwv2nUv5862uR7n7d+0E06o+XpZ3+7IwvQ7Z919vOAL9mRuX5VzcO/Cvp79f8ByjK5gXfK+r6AclAnm/gDwAAAP//S8X8mAAAAAZJREFUAwB0HToatIDUoAAAAABJRU5ErkJggg==',
        C: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABhklEQVR4AWSRSWsTURSFvyYzk/SQjI20G207dKNCXUiKIm7URV26EoS6EJy66i66a/yK/Auu/E9cuXDhUon+U/9NExSTTKYzmcmMZvS8YEKmQvCE9znvfOee815CsudW9uU4X0Y+S05Of8pAnsmX7M3uyn7+8P6S/f3Bv+zD7uD/Mmz+bcO7EmfC/8pAacz1+f4oR/A8f5mGPyHBrGTheV6WfS1m4XvYIAnAs7VCH8t9O8D/Psc6H96fL9D72sc6H16/WLD30ofXDxYsn6Xf63osT9e8fDofv797pC4fW7h3qYvXz90C199589mG32su7l28pG+eLqnz9/7Y/L36I7v/7Ifv75n7dz/8/tB93XG3oHfX7N8D/8pAacz1eb2hZ9ec3zv9/qAH3/fRCH0+VpZ9LWYI699Y9jLqX38jO/v/L0Pm7zW83tZ9v6pC0Ltrzn++KxlzfZ4vO37/AIn/778+P+jP93p9u0L+XfPf8P8BAAD//5v03L4AAAAGSURBVAMAgk20N70vWicAAAAASUVORK5CYII=',
        R: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABpklEQVR4AWSRy04TURSGnzp9tEMZByYUKVp2xtW7EnfChYv9In+Ji3ZpZ8JlYmLCoAFvIKEGfIFiWpAmMUMm9ZpKk7ZSQmkhpYmO07QDy7p6p+DExYmOnPS9v3Puuf/MmVMaD90fHqiv3S/6/uF1fX/fX9u/Hn94XvTrpxeH9K/X97rU0b8M5f82/In6GP8fgaYZNvtX6jC97vR76nSnAnW7K6Btd6Frt6N9P6XpWIn6fI36Cmjv06C6fO7mNmjv06pG95K6fNo7E7R3KVSXz9N8N7T3KWjXU6D6fK76AtTnbm6DKmX96/6N/oP+mP6U/oz+pP6E/pD+mP6Y/rjK9L7fP3R/3p676XWnAnW76/+vQ3f/RvdOf03/99X82wbGv3p+6P7wQP+tI9r7E7R3KdXtrhX9G907/f/p/U899DkbtGcpPHzQpXq9DqWpqFstG+rzNTo9U7A93fVp3dDeoaBdfzeobnclULe71Lff0UOfn8B7X93vH6hP9I+A9p5Gf99V8G+O/wMAAP//E76yFAAAAAZJREFUAwDMlAnW0oYvswAAAABJRU5ErkJggg==',

        // Row y=80 (Bottom edges)
        BL: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACTUlEQVR4AaSRS2gTURSG/0niTB4Tk1Ythm4EXQhSN7oSERFUcKm4dOFGXGh3urUbKSIUmpWPQhFRd5GqrY21YkMMamtrYhqa2pjEtE3HJrF5zCTzNndCFlOzELzw3ztzzvm/e+aMBR3Wvj09+uvrJ/T7F/sM3bvQp49dPa4f6d2tXzp2SB88fUAP9h811BHQqBRw+UEYt14sGhp6u4wbz2ahS3VksqtgRAtSuQpKBRl/AfYyFp00NRkM4OHIMPz+QQwM3MSw/w7uDt0mKUz8LCBfVJGvCGZA2/xmKoDlZBKzn+fBcUW43R78WMkgOreAa/1XoNmcyCh2bPzWzABdtoCYiTEeX4LD4WiaWXR1efFu5iOsNI1cKoPz506CW89jYRNmQF1XMPM+gmw2h8MH9+PsmVPw7GTx+NETOJUqgtMhROMJ2FkXCryIHXLFDLDbgE+RCBRRhGql8XxsAiOjT7F9JZa+G6Fdvh4zwGJpzZTjOETnvyIaixuFWxXeODttLUeHTDKVhkfm0a3VQUstQENrFaqUFTVJMV5MAIZhoGkaJEmCl3UaBWuKFWuCYqjXaYPX5?bfD9PiZHO7POZPKAp1hL8koKoqxOYcyjQL1ukA6/WCdrHYpOwgt4++CqHSkFHly2ZATQGlNGD8MtIJS1vRVreLAVHg5RSckLEhalQ6vQ1A2lrntyheYTAeimEyvIjgh0Tz/IbxcAzTcyukxDCTh3B+lTLNgASJqmqdKjdqVEkoU8UmsCRUqbJQo7jSL4rcTGra6ghoJ//l/G/AHwAAAP//j7qwmgAAAAZJREFUAwDEuRAw6dn1XQAAAABJRU5ErkJggg==',
        B: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACH0lEQVR4AcTSTU8TQRzH8e9Mt6uCYIo8RZ4ShIPAxRCJDzG+EJ/iRd+dgRMXL4DxgoAQHkoqhZbS53aLC+3utrvj7CYejBAPHpzkk//kPzO/TCYjlz88UqGlN3Pq48vpyOKrByryekYtRmZ1nVVLb7V3c2pJW34/r0LSbrYJucqgI7sjnrhBBBMvEtc1jhtoHQNXs1s+Idm4bHId6/KSv5GZquL0GmdVCBVqUKhfwQK5VXbZKDl8Tlt/WNO90MqRxcr3K6Qs5WKkYAFA8mKy+zej40P8Mj/Rw+PJBE+0p9qzqQTPpxOEVY4NmEwMd3F/pI/xgZ7IUK/JwxsOU0aLmS6Pe4kuRu52M9Lfw6g21t/LcF8vg3duI0v2LfJ1g2zZodEMaFvzkFICIkDoia98Ah3W9sJNDtaFqw+42E2XuGjrG0FMuvo/uCilz6CQRy1FuiVJNeHYM0l3QnHywiQfGJFcJ8auLdm7EBw2DXK+pntuYCIzxxbZkwaZrB05OT3nKGORTNfZT1XYPizydT/P5kGF9YMSm8kSO6k6u8kan5JF5GohL1byZ2I1l42snebEl7O8WC8WxEalLHZqNXHQsMSeVRZJqyr26lWxXSmIrXpRfKuURPgC/Mv4/wE/AQAA//8x5VrxAAAABklEQVQDAIk8oDCDnAJuAAAAAElFTkSuQmCC',
        BR: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAB3ElEQVR4AaRQSy+jURh+zqn0087X6bRjLpnMQjKbSSYzP2CSmcUsxi+wtLCxws5GhKU1FoImduxcU4oQpBoU0WpRl9C4RNHGx9f7d9Hv0Cal2oWTPO973vc8z3Pec2jN7x/qn8pP6mTDX7W3+qfa8witrvzwUUWJRY+Dp0A6gdpeJ1rH/Gh7hFYnbq9LyAGqMZpbmjAwaENnZztDn60Djqkh7QifOVp0ClrfWIEDLT92d/ZhNlsQCoXhXt3AXiCA6ZnSJvTk/ApllgpMOObxvsIKk4mHwWCAz7fLjDQTNc0GZRM9DdTjdmPEPn2LfIvurm6Y3/Ko+v8Pv75/QzB4goV5F+Kq9FSXq59Z2/oHMDw6AVmnh5RMYsXlQnlZjv9sk2cQEURG8Hh98GxsZv4jxGpK82islw15J3xKhFWJw5yOInB4lOUUzdT05Sv0RlOOdCbp2P4db0QqlYKiKOA4jvUKhYcJiIorUg5Bz4M3GlhOZt4vyzKc69sIx+KFtKxHh8ZnYH3DMfB6HbLQbp5bWIaUAEQJhLELBDbB7NoB7E4vHM4tTC1tZ7If9kUvohKH8+jNi2LNj14kFRKKXBIhJpJI7I6EM4JITCBCQiR3cryomBlo4TVgT3iNwT0AAAD//47iLPgAAAAGSURBVAMAhpLIIc+Now8AAAAASUVORK5CYII='
    };

    const tile = (url: string, repeat: 'no-repeat' | 'repeat-x' | 'repeat-y' | 'repeat') => ({
        backgroundImage: `url("${url}")`,
        backgroundRepeat: repeat,
        imageRendering: 'pixelated' as const,
        backgroundSize: '16px 16px'
    });

    return (
        <div className={`relative flex flex-col pointer-events-auto shadow-2xl ${className}`} style={style}>
            {/* Top Row */}
            <div className="flex shrink-0 h-4">
                <div className="w-4 h-4" style={tile(SLICES.TL, 'no-repeat')} />
                <div className="flex-1 h-4" style={tile(SLICES.T, 'repeat-x')} />
                <div className="w-4 h-4" style={tile(SLICES.TR, 'no-repeat')} />
            </div>

            {/* Middle Row */}
            <div className="flex flex-1 min-h-0">
                <div className="w-4" style={tile(SLICES.L, 'repeat-y')} />
                <div className="flex-1 min-w-0 relative h-full" style={tile(SLICES.C, 'repeat')}>
                    <div className="relative z-10 p-4 flex flex-col items-center justify-center min-h-full">
                        {children}
                    </div>
                </div>
                <div className="w-4" style={tile(SLICES.R, 'repeat-y')} />
            </div>

            {/* Bottom Row */}
            <div className="flex shrink-0 h-4">
                <div className="w-4 h-4" style={tile(SLICES.BL, 'no-repeat')} />
                <div className="flex-1 h-4" style={tile(SLICES.B, 'repeat-x')} />
                <div className="w-4 h-4" style={tile(SLICES.BR, 'no-repeat')} />
            </div>
        </div>
    );
};
