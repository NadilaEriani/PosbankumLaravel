import { Head, Link } from "@inertiajs/react";

import birdIcon from "../../assets/burung5.png";
import loginDesign from "../../assets/login_design.png";
import "../../../css/loginPage.css";

export default function LoginPage({ status, googleLoginUrl, errors = {} }) {
    const loginWithGoogle = () => {
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

                    {errors.email ? (
                        <div className="loginAlert error">{errors.email}</div>
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
