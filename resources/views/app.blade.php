<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

    <title inertia>SiBapak Riau | Sistem Informasi Posbankum Berdampak</title>

    <meta name="description"
        content="SiBapak Riau adalah Sistem Informasi Posbankum Berdampak Kantor Wilayah Kementerian Hukum Riau untuk mendukung informasi, layanan, dan pengelolaan Pos Bantuan Hukum di Provinsi Riau.">

    <meta name="application-name" content="SiBapak Riau">

    <meta property="og:site_name" content="SiBapak Riau">

    <meta property="og:title" content="SiBapak Riau | Sistem Informasi Posbankum Berdampak">

    <meta property="og:description"
        content="SiBapak Riau adalah Sistem Informasi Posbankum Berdampak Kantor Wilayah Kementerian Hukum Riau untuk mendukung informasi, layanan, dan pengelolaan Pos Bantuan Hukum di Provinsi Riau.">

    <meta property="og:type" content="website">
    <meta property="og:url" content="https://sibapak.pocari.id/">
    <meta property="og:image" content="https://sibapak.pocari.id/burung5.png">

    <link rel="icon" type="image/png" href="/favicon-sibapak.png">
    <link rel="shortcut icon" type="image/png" href="/favicon-sibapak.png">
    <link rel="apple-touch-icon" href="/favicon-sibapak.png">

    @verbatim
        <script type="application/ld+json">
                    {
                        "@context": "https://schema.org",
                        "@type": "WebSite",
                        "name": "SiBapak Riau",
                        "alternateName": [
                            "SiBapak",
                            "SIBAPAK",
                            "sibapak.pocari.id"
                        ],
                        "url": "https://sibapak.pocari.id/"
                    }
                </script>
    @endverbatim

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet">

    <!-- Scripts -->
    @routes
    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
    @inertiaHead
</head>

<body class="font-sans antialiased">
    <audio id="sibapak-splash-audio" preload="auto" autoplay playsinline hidden>
        <source src="/Sound1.mp3" type="audio/mpeg">
    </audio>

    <script>
        (() => {
            const audio = document.getElementById("sibapak-splash-audio");

            if (!audio) return;

            let hasStarted = false;
            audio.volume = 0.45;

            const removeUnlockListeners = () => {
                window.removeEventListener("pointerdown", unlockAudio);
                window.removeEventListener("click", unlockAudio);
                window.removeEventListener("keydown", unlockAudio);
            };

            const markStarted = () => {
                hasStarted = true;
                removeUnlockListeners();
            };

            const tryPlay = async () => {
                if (hasStarted || (!audio.paused && !audio.ended)) {
                    hasStarted = true;
                    removeUnlockListeners();
                    return true;
                }

                try {
                    await audio.play();
                    markStarted();
                    return true;
                } catch {
                    return false;
                }
            };

            function unlockAudio() {
                void tryPlay();
            }

            audio.addEventListener("playing", markStarted, {
                once: true
            });

            window.addEventListener("pointerdown", unlockAudio, {
                passive: true,
            });

            window.addEventListener("click", unlockAudio, {
                passive: true,
            });

            window.addEventListener("keydown", unlockAudio);

            window.__sibapakSplashAudio = {
                audio,
                play: tryPlay,
            };

            audio.load();
            void tryPlay();
        })();
    </script>

    @inertia
</body>

</html>