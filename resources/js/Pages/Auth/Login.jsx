import { Head, Link, useForm } from "@inertiajs/react";
import { useState } from "react";

import birdIcon from "../../assets/burung5.png";
import loginDesign from "../../assets/login_design.png";
import "../../../css/loginPage.css";

export default function LoginPage({ status, googleLoginUrl }) {
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: "",
        password: "",
        remember: false,
    });

    const submit = (event) => {
        event.preventDefault();

        post("/login", {
            onError: () => setShowEmailForm(true),
            onFinish: () => reset("password"),
        });
    };

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

                    {errors.password ? (
                        <div className="loginAlert error">
                            {errors.password}
                        </div>
                    ) : null}

                    <button
                        type="button"
                        className="googleLoginButton"
                        onClick={loginWithGoogle}
                        disabled={processing}
                    >
                        <span className="googleLetter" aria-hidden="true">
                            G
                        </span>
                        <span>Login dengan Google</span>
                    </button>

                    <p className="loginSecureText">
                        Autentikasi aman menggunakan Google Sign-In.
                    </p>

                    <button
                        type="button"
                        className="emailLoginToggle"
                        onClick={() => setShowEmailForm((value) => !value)}
                        aria-expanded={showEmailForm}
                    >
                        {showEmailForm
                            ? "Tutup login dengan email"
                            : "Login dengan email"}
                    </button>

                    {showEmailForm ? (
                        <form
                            className="emailLoginForm"
                            onSubmit={submit}
                            autoComplete="off"
                        >
                            <label className="loginField">
                                <span>Email</span>
                                <input
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    onChange={(event) =>
                                        setData("email", event.target.value)
                                    }
                                    placeholder="nama@email.com"
                                    disabled={processing}
                                    autoComplete="off"
                                    required
                                />
                            </label>

                            <label className="loginField">
                                <span>Kata Sandi</span>
                                <div className="passwordField">
                                    <input
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        name="password"
                                        value={data.password}
                                        onChange={(event) =>
                                            setData(
                                                "password",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Masukkan kata sandi"
                                        disabled={processing}
                                        autoComplete="new-password"
                                        required
                                    />

                                    <button
                                        type="button"
                                        className="passwordToggle"
                                        onClick={() =>
                                            setShowPassword((value) => !value)
                                        }
                                        disabled={processing}
                                    >
                                        {showPassword ? "Sembunyikan" : "Lihat"}
                                    </button>
                                </div>
                            </label>

                            <label className="rememberField">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(event) =>
                                        setData(
                                            "remember",
                                            event.target.checked,
                                        )
                                    }
                                    disabled={processing}
                                />
                                <span>Ingat saya</span>
                            </label>

                            <button
                                type="submit"
                                className="emailSubmitButton"
                                disabled={processing}
                            >
                                {processing ? "Memproses..." : "Masuk"}
                            </button>
                        </form>
                    ) : null}
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
