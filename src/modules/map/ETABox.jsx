function ETABox({ eta, distance, nextStop }) {

    return (

        <div
            style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                padding: "18px 20px",
                color: "var(--text)"
            }}
        >

            <div style={{
                fontSize: 10,
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "var(--muted)",
                marginBottom: 12
            }}>
                🚌 BUS ETA
            </div>

            <div style={{ marginBottom: 12 }}>
                <div style={{
                    fontFamily: "Syne,sans-serif",
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 4
                }}>
                    Next Stop: {nextStop}
                </div>
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                    <div style={{
                        fontFamily: "Syne,sans-serif",
                        fontSize: 24,
                        fontWeight: 800,
                        color: "var(--accent)",
                        marginBottom: 4
                    }}>
                        {eta}
                        <span style={{
                            fontSize: 14,
                            fontWeight: 400,
                            color: "var(--muted)"
                        }}> min</span>
                    </div>
                    <div style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: 1
                    }}>
                        ETA
                    </div>
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{
                        fontFamily: "Syne,sans-serif",
                        fontSize: 24,
                        fontWeight: 800,
                        color: "var(--gold)",
                        marginBottom: 4
                    }}>
                        {distance}
                        <span style={{
                            fontSize: 14,
                            fontWeight: 400,
                            color: "var(--muted)"
                        }}> km</span>
                    </div>
                    <div style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: 1
                    }}>
                        Distance
                    </div>
                </div>
            </div>

        </div>
    );
}

export default ETABox;