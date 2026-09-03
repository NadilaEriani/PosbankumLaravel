<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

    <title inertia>SiBapak | Sistem Informasi Pos Bantuan Hukum Kemenkum Riau</title>

    <meta name="description"
        content="SiBapak adalah Sistem Informasi Pos Bantuan Hukum Kantor Wilayah Kementerian Hukum Riau untuk mendukung layanan dan pengelolaan Posbankum di Provinsi Riau.">

    <meta name="application-name" content="SiBapak">

    <meta property="og:site_name" content="SiBapak">
    <meta property="og:title" content="SiBapak | Sistem Informasi Pos Bantuan Hukum Kemenkum Riau">
    <meta property="og:description"
        content="SiBapak adalah Sistem Informasi Pos Bantuan Hukum Kantor Wilayah Kementerian Hukum Riau untuk mendukung layanan dan pengelolaan Posbankum di Provinsi Riau.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://sibapak.pocari.id/">
    <meta property="og:image" content="https://sibapak.pocari.id/burung5.png">

    <link rel="icon" type="image/png" href="/favicon-sibapak.png">
    <link rel="shortcut icon" type="image/png" href="/favicon-sibapak.png">
    <link rel="apple-touch-icon" href="/favicon-sibapak.png">

    <link rel="preload" href="/Sound1.mp3" as="audio" type="audio/mpeg">

    @verbatim
        <script type="application/ld+json">
                                {
                                    "@context": "https://schema.org",
                                    "@type": "WebSite",
                                    "name": "SiBapak",
                                    "alternateName": "SIBAPAK",
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
    <audio id="sibapak-splash-audio" preload="auto" playsinline hidden>
        <source src="/Sound1.mp3" type="audio/mpeg">
    </audio>

    @inertia
</body>

</html>