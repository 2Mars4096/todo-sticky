import Flutter
import UIKit

class SceneDelegate: FlutterSceneDelegate {
  override func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
                      options connectionOptions: UIScene.ConnectionOptions) {
    super.scene(scene, willConnectTo: session, options: connectionOptions)
    for item in connectionOptions.urlContexts { (UIApplication.shared.delegate as? AppDelegate)?.receive(item.url) }
    for activity in connectionOptions.userActivities where activity.activityType == NSUserActivityTypeBrowsingWeb {
      if let url = activity.webpageURL { (UIApplication.shared.delegate as? AppDelegate)?.receive(url) }
    }
  }

  override func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    super.scene(scene, continue: userActivity)
    if userActivity.activityType == NSUserActivityTypeBrowsingWeb, let url = userActivity.webpageURL {
      (UIApplication.shared.delegate as? AppDelegate)?.receive(url)
    }
  }

  override func scene(_ scene: UIScene, openURLContexts contexts: Set<UIOpenURLContext>) {
    super.scene(scene, openURLContexts: contexts)
    for item in contexts { (UIApplication.shared.delegate as? AppDelegate)?.receive(item.url) }
  }
}
