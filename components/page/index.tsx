import Head from '@components/head'
import Header from '@components/header'
import styles from './page.module.css'


type Props = {
  header?: boolean
  title: string
  description: string
  image?: string
  showHeaderTitle?: boolean
  children: React.ReactNode | React.ReactNode[]
}

const Page = ({
  header = true,
  title,
  description,
  image,
  showHeaderTitle = true,
  children,
}: Props) => {
  return (
    <div className={styles.wrapper}>
      <Head
        title={`${title ? `${title} - ` : ''}Max Leiter`}
        description={description}
        image={image}
      />

      <Header render={header} title={showHeaderTitle ? title : ''} />
      <main className={styles.main}>{children}</main>
      <div className={styles.fade} />
    </div>
  )
}

export default Page
