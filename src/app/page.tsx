import styles from "./page.module.css";
import WebRTCSources from "./components/WebRTCSources";

const Home: React.FC = () => {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <WebRTCSources/>
      </main>
    </div>
  );
};

export default Home;