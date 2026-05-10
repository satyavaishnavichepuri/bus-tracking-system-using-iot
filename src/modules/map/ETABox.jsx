function ETABox({ eta, distance, nextStop }) {

    return (

        <div
            style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "white",
                padding: "15px",
                borderRadius: "12px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                zIndex: 1000,
                minWidth: "220px"
            }}
        >

            <h3>Bus ETA</h3>

            <p>
                Next Stop:
                <b> {nextStop}</b>
            </p>

            <p>
                ETA:
                <b> {eta} min</b>
            </p>

            <p>
                Distance:
                <b> {distance} km</b>
            </p>

        </div>
    );
}

export default ETABox;