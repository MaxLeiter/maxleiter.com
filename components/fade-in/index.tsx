// https://www.joshwcomeau.com/snippets/react-components/fade-in/

import { ReactNode } from 'react';
import styles from './fade.module.css'

type Props = {
    children: ReactNode,
    duration?: number,
    delay?: number,
}

const FadeIn = ({
  duration = 300,
  delay = 0,
  children,
}: Props) => {
  return (<div style={{
        animationDuration: duration + 'ms',
        animationDelay: delay + 'ms',
      }}
      className={styles.fadeIn}
    >
      {children}
    </div>
  );
};

export default FadeIn