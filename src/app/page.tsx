import styles from "./page.module.css";
import SelectSources from "./components/SelectSources/SelectSources";

const Home: React.FC = () => {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <SelectSources/>
      </main>
    </div>
  );
};

export default Home;