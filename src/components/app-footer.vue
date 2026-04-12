<template>
  <div class="footer">
    <div class="footer-content">
        <img src="../assets/icons/logo.svg" alt="" width="200"/>
      <div class="support">
        <p>Связаться с нами</p>
        <a href="mailto:ksebija@gmail.com">ksebija@gmail.com</a>
        <p></p>
      </div>
    </div>
    <div class="copyright">
      <p style="text-align: center">© 2025 SkyTickets. Все права защищены.</p>
    </div>
  </div>
</template>

<style scoped>
a {
  color: var(--color-grey-400);
  text-decoration: none;
}
p {
  color: var(--color-grey-600);
  font-weight: bold;
}
.footer {
  display: flex;
  flex-direction: column;
}
.footer-content {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  padding: 60px;
}
.footer-content img {
  justify-self: center;
}
.support {
  display: flex;
  flex-direction: column;
}
.copyright {
 border-top: 1px solid var(--color-grey-200);
}
.copyright p {
  color: var(--color-grey-400);
  font-weight: normal;
}
</style>
