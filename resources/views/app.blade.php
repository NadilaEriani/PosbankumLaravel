@php
    $faviconVersion = file_exists(public_path('burung5.png'))
        ? filemtime(public_path('burung5.png'))
        : time();
@endphp

<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

    <title inertia>{{ config('app.name', 'Laravel') }}</title>

    <link rel="icon" type="image/png" href="{{ asset('burung5.png') }}?v={{ $faviconVersion }}">
    <link rel="shortcut icon" type="image/png" href="{{ asset('burung5.png') }}?v={{ $faviconVersion }}">
    <link rel="apple-touch-icon" href="{{ asset('burung5.png') }}?v={{ $faviconVersion }}">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

    <!-- Scripts -->
    @routes
    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
    @inertiaHead
</head>

<body class="font-sans antialiased">
    @inertia
</body>

</html>