import { useEffect, useState } from "react";
import { Head, Link } from "@inertiajs/react";

import birdIcon from "../../assets/burung5.png";
import loginDesign from "../../assets/login_design.png";
import "../../../css/loginPage.css";

const NETWORK_ERROR_MESSAGE =
    "Koneksi internet atau jaringan terputus. Periksa koneksi Anda, lalu coba login kembali.";

export default function LoginPage({ status, googleLoginUrl, errors = {} }) {
    const rawLoginError =
        errors.email ||
        errors.google ||
        Object.values(errors).flat().filter(Boolean)[0] ||
        "";
    const loginError = Array.isArray(rawLoginError)
        ? rawLoginError[0]
        : rawLoginError;

    const [networkError, setNetworkError] = useState("");

    useEffect(() => {
        const updateNetworkStatus = () => {
            setNetworkError(
                typeof navigator !== "undefined" && !navigator.onLine
                    ? NETWORK_ERROR_MESSAGE
                    : "",
            );
        };

        updateNetworkStatus();

        window.addEventListener("offline", updateNetworkStatus);
        window.addEventListener("online", updateNetworkStatus);

        return () => {
            window.removeEventListener("offline", updateNetworkStatus);
            window.removeEventListener("online", updateNetworkStatus);
        };
    }, []);

    const loginWithGoogle = () => {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
            setNetworkError(NETWORK_ERROR_MESSAGE);
            return;
        }

        setNetworkError("");
        window.location.assign(googleLoginUrl || "/auth/google/redirect");
    };

    return (
        <div className="loginPage">
            <Head title="Login" />

            <Link href="/" className="loginBackBtn">
                <span className="loginBackIcon" aria-hidden="true">
                    &larr;
                </span>
                <span>Kembali ke Beranda</span>
            </Link>

            <main className="loginStage">
                <section className="loginCard" aria-label="Login Posbankum">
                    <div className="loginBirdFrame" aria-hidden="true">
                        <img className="loginBirdImage" src={birdIcon} alt="" />
                    </div>

                    <p className="loginBrand">
                        <strong>Posbankum</strong> Provinsi Riau
                    </p>

                    <h1>Login dengan Google</h1>

                    <p className="loginDescription">
                        Gunakan akun Google yang telah terdaftar untuk mengakses
                        SIBAPAK Posbankum.
                    </p>

                    {status ? (
                        <div className="loginAlert success">{status}</div>
                    ) : null}

                    {networkError ? (
                        <div className="loginAlert error" role="alert">
                            <strong>Koneksi bermasalah.</strong>
                            <span>{networkError}</span>
                        </div>
                    ) : loginError ? (
                        <div className="loginAlert error" role="alert">
                            <strong>Login gagal.</strong>
                            <span>{String(loginError)}</span>
                        </div>
                    ) : null}

                    <button
                        type="button"
                        className="googleLoginButton"
                        onClick={loginWithGoogle}
                    >
                        <span className="googleLetter" aria-hidden="true">
                            G
                        </span>
                        <span>Login dengan Google</span>
                    </button>

                    <p className="loginSecureText">
                        Autentikasi aman menggunakan Google Sign-In.
                    </p>
                </section>
            </main>

            <img
                className="loginDesignImage"
                src={loginDesign}
                alt=""
                aria-hidden="true"
            />
        </div>
    );
}
