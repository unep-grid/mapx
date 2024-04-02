export async function mapComposerModalAuto() {
  try {
    const { MapComposerModal } = await import("./map_composer_modal.js");
    const mc = new MapComposerModal();
    await mc.init();
  } catch (e) {
    console.error(e);
  }
}
