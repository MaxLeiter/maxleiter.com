import Head from '@components/head'
import Header from '@components/header'
import styles from './page.module.css'

const Page = ({
  header = true,
  footer = true,
  title,
  description,
  image,
  showHeaderTitle = true,
  children,
}) => {
  return (
    <div className={styles.wrapper}>
      <Head
        title={`${title ? `${title} - ` : ''}Max Leiter`}
        description={description}
        image={image}
      />

      <Header render={header} title={showHeaderTitle && title} />
      <main className={styles.main}>{children}</main>
      <div className={styles.fade} />
    </div>
  )
}

export default Page
